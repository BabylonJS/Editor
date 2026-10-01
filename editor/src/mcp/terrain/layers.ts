import { extname } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene } from "babylonjs";
import type { ITerrainLayerData, TerrainMapChannel, TerrainNormalConvention } from "babylonjs-editor-tools";

import { getTerrainMeshInfo, getTerrainPlugin } from "../../tools/terrain/engine/info";
import {
	createTerrainLayerFromMaterialData,
	addTerrainMaterialLayers,
	moveTerrainMaterialLayer,
	removeTerrainMaterialLayer,
	updateTerrainMaterialLayer,
} from "../../tools/terrain/engine/layers";
import { disableTerrainTexturePainting, enableTerrainTexturePainting, setTerrainMaterialSettings } from "../../tools/terrain/engine/material";
import type { ITerrainMaterialSettingsPatch } from "../../tools/terrain/engine/types";
import { importTerrainSourceFiles } from "../../tools/terrain/io/sources";

import { IMCPActionOptions } from "../action";
import { resolveMaterial } from "../tools/resolve";

import {
	ITerrainMcpTarget,
	TERRAIN_MCP_MAX_LAYERS,
	TERRAIN_MCP_MAX_LAYERS_MESSAGE,
	getTerrainMcpFileStem,
	getTerrainMcpLayerData,
	getTerrainMcpLayerNotFoundMessage,
	getTerrainMcpLayers,
	getTerrainMcpMetric,
	getTerrainMcpProjectRelativePath,
	getTerrainMcpWarnings,
	isTerrainMcpObject,
	readTerrainMcpBoolean,
	readTerrainMcpEnum,
	readTerrainMcpLayerReference,
	readTerrainMcpNumber,
	readTerrainMcpPoint,
	readTerrainMcpString,
	readTerrainMcpTextureSize,
	refreshTerrainMcpAssets,
	resolveTerrainMcpLayer,
	resolveTerrainMcpPath,
	resolveTerrainMcpTarget,
	runTerrainMcpMutationAsync,
	runTerrainMcpPreparedMutationAsync,
	throwTerrainMcpInvalidArgument,
	toTerrainMcpLocalTile,
	validateTerrainMcpNumber,
	validateTerrainMcpTuple,
	waitForTerrainMcpReadyAsync,
} from "./shared";

/**
 * Map slots of a layer that set_terrain_layer accepts as image paths (null clears the slot).
 */
export const TERRAIN_MCP_LAYER_MAP_KEYS = ["albedo", "normal", "roughnessMap", "aoMap", "heightMap"] as const;

/**
 * Map slot of a layer.
 */
export type TerrainMcpLayerMapKey = (typeof TERRAIN_MCP_LAYER_MAP_KEYS)[number];

/**
 * Channels accepted for the roughness, AO and height maps.
 */
export const TERRAIN_MCP_MAP_CHANNELS: readonly TerrainMapChannel[] = ["r", "g", "b", "a", "luminance"];

/**
 * File names of DirectX normal maps (same rule as the map slots of the Terrain tab, §1.10).
 */
export const TERRAIN_MCP_DIRECTX_NORMAL_REGEX = /(^|[_\-. ])(dx|directx|normaldx|nor_dx)([_\-. ]|$)/i;

// set_terrain_layer

/**
 * Validated arguments of set_terrain_layer.
 */
interface ITerrainMcpLayerArguments {
	layer?: number | string;
	remove: boolean;
	index?: number;
	name?: string;
	maps: Partial<Record<TerrainMcpLayerMapKey, string | null>>;
	normalConvention?: TerrainNormalConvention;
	roughnessChannel?: TerrainMapChannel;
	aoChannel?: TerrainMapChannel;
	heightChannel?: TerrainMapChannel;
	roughnessInvert?: boolean;
	fromMaterialId?: string;
	fromMaterialAssetPath?: string;
	tileSize?: [number, number];
	tileOffset?: [number, number];
	tint?: [number, number, number];
	roughness?: number;
	metallic?: number;
	aoStrength?: number;
	normalStrength?: number;
	heightScale?: number;
	heightOffset?: number;
}

function readTerrainMcpLayerArguments(data: unknown): ITerrainMcpLayerArguments {
	const maps: Partial<Record<TerrainMcpLayerMapKey, string | null>> = {};
	for (const key of TERRAIN_MCP_LAYER_MAP_KEYS) {
		const value = isTerrainMcpObject(data) ? data[key] : undefined;
		if (value === null) {
			maps[key] = null;
		} else if (value !== undefined) {
			maps[key] = readTerrainMcpString(data, key);
		}
	}

	let tileSize: [number, number] | undefined;
	const tileSizeValue = isTerrainMcpObject(data) ? data.tileSize : undefined;
	if (typeof tileSizeValue === "number") {
		const size = validateTerrainMcpNumber(tileSizeValue, "tileSize", { above: 0 })!;
		tileSize = [size, size];
	} else if (tileSizeValue !== undefined && tileSizeValue !== null) {
		const size = validateTerrainMcpTuple(tileSizeValue, 2, "tileSize");
		if (!size || size[0] <= 0 || size[1] <= 0) {
			throwTerrainMcpInvalidArgument("tileSize", "a positive number or an array of 2 positive numbers (world cm)");
		}

		tileSize = [size[0], size[1]];
	}

	const tint = validateTerrainMcpTuple(isTerrainMcpObject(data) ? data.tint : undefined, 3, "tint");
	if (tint && tint.some((value) => value < 0 || value > 1)) {
		throwTerrainMcpInvalidArgument("tint", "an array of 3 numbers between 0 and 1");
	}

	const fromMaterialId = readTerrainMcpString(data, "fromMaterialId");
	const fromMaterialAssetPath = readTerrainMcpString(data, "fromMaterialAssetPath");
	if (fromMaterialId && fromMaterialAssetPath) {
		throw new Error("Pass fromMaterialId or fromMaterialAssetPath, not both.");
	}

	return {
		layer: readTerrainMcpLayerReference(data, "layer"),
		remove: readTerrainMcpBoolean(data, "remove") ?? false,
		index: readTerrainMcpNumber(data, "index", { integer: true, min: 0, max: TERRAIN_MCP_MAX_LAYERS - 1 }),
		name: readTerrainMcpString(data, "name"),
		maps,
		normalConvention: readTerrainMcpEnum(data, "normalConvention", ["opengl", "directx"] as const),
		roughnessChannel: readTerrainMcpEnum(data, "roughnessChannel", TERRAIN_MCP_MAP_CHANNELS),
		aoChannel: readTerrainMcpEnum(data, "aoChannel", TERRAIN_MCP_MAP_CHANNELS),
		heightChannel: readTerrainMcpEnum(data, "heightChannel", TERRAIN_MCP_MAP_CHANNELS),
		roughnessInvert: readTerrainMcpBoolean(data, "roughnessInvert"),
		fromMaterialId,
		fromMaterialAssetPath,
		tileSize,
		tileOffset: readTerrainMcpPoint(data, "tileOffset"),
		tint: tint ? [tint[0], tint[1], tint[2]] : undefined,
		roughness: readTerrainMcpNumber(data, "roughness", { min: 0, max: 1 }),
		metallic: readTerrainMcpNumber(data, "metallic", { min: 0, max: 1 }),
		aoStrength: readTerrainMcpNumber(data, "aoStrength", { min: 0, max: 1 }),
		normalStrength: readTerrainMcpNumber(data, "normalStrength", { min: 0, max: 2 }),
		heightScale: readTerrainMcpNumber(data, "heightScale", { min: 0, max: 2 }),
		heightOffset: readTerrainMcpNumber(data, "heightOffset", { min: -1, max: 1 }),
	};
}

/**
 * Returns whether or not a layer reference designates the "Base" layer (index 0) that enabling texture painting creates.
 * @param reference defines the layer index, id or name.
 */
export function isTerrainMcpBaseLayerReference(reference: number | string): boolean {
	return reference === 0 || (typeof reference === "string" && ["0", "base"].includes(reference.trim().toLowerCase()));
}

/**
 * Layer data read from a PBR or Standard material (§1.10.3): a scene material (`fromMaterialId`) or a `.material` asset.
 * @param target defines the terrain (its local size gives the tiling).
 * @param args defines the validated arguments.
 */
async function readTerrainMcpMaterialLayerAsync(target: ITerrainMcpTarget, args: ITerrainMcpLayerArguments): Promise<Partial<ITerrainLayerData> | null> {
	let data: any;
	let label: string;

	if (args.fromMaterialId) {
		const material = resolveMaterial({ scene: target.scene, materialId: args.fromMaterialId, materialName: args.fromMaterialId });
		data = material.serialize();
		label = material.name;
	} else if (args.fromMaterialAssetPath) {
		const absolutePath = resolveTerrainMcpPath(args.fromMaterialAssetPath);
		if (extname(absolutePath).toLowerCase() !== ".material") {
			throw new Error(`"${args.fromMaterialAssetPath}" is not a ".material" asset.`);
		}

		try {
			data = await readJSON(absolutePath);
		} catch (e) {
			throw new Error(`Failed to read the material asset "${args.fromMaterialAssetPath}": ${e instanceof Error ? e.message : String(e)}`);
		}

		label = args.fromMaterialAssetPath;
	} else {
		return null;
	}

	const info = getTerrainMeshInfo(target.mesh);
	const layer = createTerrainLayerFromMaterialData(data, { width: info.width, height: info.height });
	if (!layer) {
		throw new Error(`Material "${label}" can't become a terrain layer: only PBR and Standard materials can.`);
	}

	return layer;
}

/**
 * Imports the map files of the arguments (files outside the project are copied into assets/terrain-textures/) and returns the
 * project-relative paths per slot. `copied` is true when a file was copied into the project.
 * @param args defines the validated arguments.
 */
async function importTerrainMcpLayerMapsAsync(args: ITerrainMcpLayerArguments): Promise<{ maps: Partial<Record<TerrainMcpLayerMapKey, string | null>>; copied: boolean }> {
	const maps: Partial<Record<TerrainMcpLayerMapKey, string | null>> = {};
	const imported = new Map<string, string>();

	let copied = false;

	for (const key of TERRAIN_MCP_LAYER_MAP_KEYS) {
		const path = args.maps[key];
		if (path === undefined) {
			continue;
		}

		if (path === null) {
			maps[key] = null;
			continue;
		}

		const absolutePath = resolveTerrainMcpPath(path);

		let relativePath = imported.get(absolutePath);
		if (!relativePath) {
			const result = await importTerrainSourceFiles([absolutePath]);
			if (result.rejected.length || !result.imported.length) {
				throw new Error(`Can't use "${path}" as the ${key} of a terrain layer: ${result.rejected[0]?.reason ?? "the file can't be imported."}`);
			}

			relativePath = result.imported[0];
			imported.set(absolutePath, relativePath);

			if (getTerrainMcpProjectRelativePath(absolutePath) !== relativePath) {
				copied = true;
			}
		}

		maps[key] = relativePath;
	}

	return { maps, copied };
}

/**
 * What set_terrain_layer reads and copies before its mutation (see runTerrainMcpPreparedMutationAsync): the layer of the source material and
 * the project-relative paths of the maps (files outside the project copied into assets/terrain-textures/).
 */
interface ITerrainMcpPreparedLayer {
	materialLayer: Partial<ITerrainLayerData> | null;
	maps: Partial<Record<TerrainMcpLayerMapKey, string | null>>;
}

/**
 * Checks what set_terrain_layer asks for against the current layers (layer reference, last layer, 8 layers maximum). Run before the files of
 * the call are copied into the project, and again by the mutation.
 * @param target defines the terrain.
 * @param args defines the validated arguments.
 */
function assertTerrainMcpLayerCallAllowed(target: ITerrainMcpTarget, args: ITerrainMcpLayerArguments): void {
	const { mesh } = target;

	if (args.remove) {
		const layer = resolveTerrainMcpLayer(target, args.layer);
		if (getTerrainMcpLayerData(target).length <= 1) {
			throw new Error(
				`Layer "${layer.name}" is the last layer of terrain "${mesh.name}": a terrain material needs at least one layer (set_terrain_material with texturePainting "disable" removes texture painting).`
			);
		}

		return;
	}

	// The only layer a terrain without terrain material will have is the "Base" layer created with it.
	if (!getTerrainPlugin(mesh) && args.layer !== undefined && !isTerrainMcpBaseLayerReference(args.layer)) {
		throw new Error(getTerrainMcpLayerNotFoundMessage(args.layer, mesh.name, []));
	}

	if (getTerrainPlugin(mesh) && args.layer !== undefined) {
		resolveTerrainMcpLayer(target, args.layer);
	}

	if (getTerrainPlugin(mesh) && args.layer === undefined && getTerrainMcpLayerData(target).length >= TERRAIN_MCP_MAX_LAYERS) {
		throw new Error(TERRAIN_MCP_MAX_LAYERS_MESSAGE);
	}
}

/**
 * Reads the source material and imports the map files of set_terrain_layer (before its mutation). Refreshes the assets browser when files
 * were copied into the project.
 * @param target defines the terrain.
 * @param args defines the validated arguments.
 */
async function prepareTerrainMcpLayerAsync(target: ITerrainMcpTarget, args: ITerrainMcpLayerArguments): Promise<ITerrainMcpPreparedLayer> {
	if (args.remove) {
		return { materialLayer: null, maps: {} };
	}

	assertTerrainMcpLayerCallAllowed(target, args);

	const materialLayer = await readTerrainMcpMaterialLayerAsync(target, args);

	const { maps, copied } = await importTerrainMcpLayerMapsAsync(args);
	if (copied) {
		refreshTerrainMcpAssets(target.editor);
	}

	return { materialLayer, maps };
}

/**
 * Builds the layer patch of set_terrain_layer: the material layer first (without its name when updating a layer), then the explicit
 * arguments. tileSize / tileOffset are converted from world cm to the local cm of the data model (§8.1 rule 7).
 * @param target defines the terrain.
 * @param args defines the validated arguments.
 * @param prepared defines the material layer and the imported maps (prepareTerrainMcpLayerAsync).
 * @param update defines whether an existing layer is updated (the material name doesn't rename it).
 */
function buildTerrainMcpLayerPatch(
	target: ITerrainMcpTarget,
	args: ITerrainMcpLayerArguments,
	prepared: ITerrainMcpPreparedLayer,
	update: boolean
): Partial<Omit<ITerrainLayerData, "id">> {
	const patch: Partial<Omit<ITerrainLayerData, "id">> & { id?: string } = {};

	if (prepared.materialLayer) {
		Object.assign(patch, prepared.materialLayer);
		delete patch.id;

		if (update) {
			delete patch.name;
		}
	}

	const maps = prepared.maps;
	Object.assign(patch, maps);

	if (args.name !== undefined) {
		patch.name = args.name;
	}

	if (args.normalConvention !== undefined) {
		patch.normalConvention = args.normalConvention;
	} else if (typeof maps.normal === "string" && TERRAIN_MCP_DIRECTX_NORMAL_REGEX.test(getTerrainMcpFileStem(maps.normal))) {
		patch.normalConvention = "directx";
	}

	const metric = getTerrainMcpMetric(target.mesh);

	if (args.tileSize) {
		patch.tileSize = toTerrainMcpLocalTile(args.tileSize, metric);
	}

	if (args.tileOffset) {
		patch.tileOffset = toTerrainMcpLocalTile(args.tileOffset, metric);
	}

	const scalars = [
		"roughnessChannel",
		"aoChannel",
		"heightChannel",
		"roughnessInvert",
		"tint",
		"roughness",
		"metallic",
		"aoStrength",
		"normalStrength",
		"heightScale",
		"heightOffset",
	] as const;

	for (const key of scalars) {
		if (args[key] !== undefined) {
			(patch as any)[key] = args[key];
		}
	}

	return patch;
}

/**
 * set_terrain_layer: adds (no `layer`), updates, moves (`index`) or removes (`remove`) a texture layer (§8.1 rule 8). A terrain without terrain
 * material gets one first (`enableTexturePainting` "create", its own undo entry, layer 0 = the grey "Base" layer). Map paths are
 * project-relative or absolute (files outside the project are copied into assets/terrain-textures/, null clears a slot); tile sizes and
 * offsets are world cm. Waits for the terrain to render the result (§8.1 rule 4).
 */
export async function setTerrainLayer(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);
	const args = readTerrainMcpLayerArguments(data);

	if (args.remove && args.layer === undefined) {
		throw new Error('Pass the layer to remove ("layer": index, id or name).');
	}

	return runTerrainMcpPreparedMutationAsync(
		target,
		() => prepareTerrainMcpLayerAsync(target, args),
		async (prepared) => {
			const { editor, mesh } = target;
			const warnings: string[] = [];

			assertTerrainMcpLayerCallAllowed(target, args);

			if (args.remove) {
				const layer = resolveTerrainMcpLayer(target, args.layer);

				await removeTerrainMaterialLayer(editor, mesh, layer.id);
				await waitForTerrainMcpReadyAsync(target, warnings);

				return { layers: getTerrainMcpLayers(target), layerId: layer.id, enabledTexturePainting: false, ...getTerrainMcpWarnings(warnings) };
			}

			const patch = buildTerrainMcpLayerPatch(target, args, prepared, args.layer !== undefined);

			let enabledTexturePainting = false;
			if (!getTerrainPlugin(mesh)) {
				await enableTerrainTexturePainting(editor, mesh, { from: "create" });
				enabledTexturePainting = true;
			}

			let layerId: string;

			if (args.layer === undefined) {
				const layers = getTerrainMcpLayerData(target);
				if (layers.length >= TERRAIN_MCP_MAX_LAYERS) {
					throw new Error(TERRAIN_MCP_MAX_LAYERS_MESSAGE);
				}

				patch.name ??= typeof patch.albedo === "string" ? getTerrainMcpFileStem(patch.albedo) : `Layer ${layers.length + 1}`;

				const ids = await addTerrainMaterialLayers(editor, mesh, [patch], args.index === undefined ? undefined : { index: Math.min(args.index, layers.length) });
				if (!ids.length) {
					throw new Error(TERRAIN_MCP_MAX_LAYERS_MESSAGE);
				}

				layerId = ids[0];
			} else {
				const layer = resolveTerrainMcpLayer(target, args.layer);
				layerId = layer.id;

				if (Object.keys(patch).length) {
					updateTerrainMaterialLayer(mesh, layer.id, patch, { undo: true });
				}

				if (args.index !== undefined) {
					const layers = getTerrainMcpLayerData(target);
					const from = layers.findIndex((candidate) => candidate.id === layer.id);
					const to = Math.min(args.index, layers.length - 1);

					if (from !== -1 && from !== to) {
						await moveTerrainMaterialLayer(editor, mesh, layer.id, to);
					}
				}
			}

			await waitForTerrainMcpReadyAsync(target, warnings);

			return { layers: getTerrainMcpLayers(target), layerId, enabledTexturePainting, ...getTerrainMcpWarnings(warnings) };
		}
	);
}

// set_terrain_material

/**
 * Returns the material description of set_terrain_material.
 * @param target defines the terrain.
 */
function getTerrainMcpMaterialResult(target: ITerrainMcpTarget): any {
	const { mesh } = target;
	const plugin = getTerrainPlugin(mesh);
	const material = mesh.material;

	return {
		material: material ? { id: material.id, name: material.name, isTerrainMaterial: !!plugin } : null,
		settings: plugin
			? {
					enabled: plugin.data.enabled,
					weightMapSize: plugin.data.weightMapSize,
					layerTextureSize: plugin.data.layerTextureSize,
					anisotropy: plugin.data.anisotropy,
					heightBlend: plugin.data.heightBlend,
					heightBlendTransition: plugin.data.heightBlendTransition,
				}
			: null,
		budget: plugin ? { ...plugin.budgetInfo, dropped: plugin.budgetInfo.dropped.slice() } : null,
	};
}

/**
 * set_terrain_material: enables texture painting (a new terrain material, or the current PBR / Standard material converted with
 * fromCurrentMaterial), disables it (the terrain gets back its previous material, else a plain material made from layer 0), and changes the
 * settings of the terrain material. One undo entry per change. Waits for the terrain to render the result (§8.1 rule 4).
 */
export async function setTerrainMaterial(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const texturePainting = readTerrainMcpEnum(data, "texturePainting", ["enable", "disable"] as const);
	const fromCurrentMaterial = readTerrainMcpBoolean(data, "fromCurrentMaterial") ?? false;

	const patch: ITerrainMaterialSettingsPatch = {};
	const enabled = readTerrainMcpBoolean(data, "enabled");
	const weightMapSize = readTerrainMcpTextureSize(data, "weightMapSize");
	const layerTextureSize = readTerrainMcpTextureSize(data, "layerTextureSize");
	const anisotropy = readTerrainMcpNumber(data, "anisotropy", { integer: true, min: 1, max: 16 });
	const heightBlend = readTerrainMcpBoolean(data, "heightBlend");
	const heightBlendTransition = readTerrainMcpNumber(data, "heightBlendTransition", { min: 0.01, max: 1 });

	if (enabled !== undefined) {
		patch.enabled = enabled;
	}

	if (weightMapSize !== undefined) {
		patch.weightMapSize = weightMapSize;
	}

	if (layerTextureSize !== undefined) {
		patch.layerTextureSize = layerTextureSize;
	}

	if (anisotropy !== undefined) {
		patch.anisotropy = anisotropy;
	}

	if (heightBlend !== undefined) {
		patch.heightBlend = heightBlend;
	}

	if (heightBlendTransition !== undefined) {
		patch.heightBlendTransition = heightBlendTransition;
	}

	const hasSettings = Object.keys(patch).length > 0;
	if (texturePainting === "disable" && hasSettings) {
		throw new Error('texturePainting "disable" can\'t be combined with material settings: the terrain material is removed from the terrain.');
	}

	return runTerrainMcpMutationAsync(target, async () => {
		const { editor, mesh } = target;
		const warnings: string[] = [];

		let enabledTexturePainting = false;

		if (texturePainting === "enable" && !getTerrainPlugin(mesh)) {
			await enableTerrainTexturePainting(editor, mesh, { from: fromCurrentMaterial ? "convert" : "create" });
			enabledTexturePainting = true;
		}

		if (texturePainting === "disable" && getTerrainPlugin(mesh)) {
			await disableTerrainTexturePainting(editor, mesh);
		}

		if (hasSettings) {
			if (!getTerrainPlugin(mesh)) {
				throw new Error(`Terrain "${mesh.name}" has no terrain material: pass texturePainting "enable" to create one first.`);
			}

			await setTerrainMaterialSettings(editor, mesh, patch);
		}

		await waitForTerrainMcpReadyAsync(target, warnings);

		return { ...getTerrainMcpMaterialResult(target), enabledTexturePainting, ...getTerrainMcpWarnings(warnings) };
	});
}
