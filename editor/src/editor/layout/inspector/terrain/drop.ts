import { readJSON } from "fs-extra";
import { basename, extname } from "path/posix";

import { toast } from "sonner";

import { Mesh } from "babylonjs";
import { ITerrainLayerData } from "babylonjs-editor-tools";

import { Editor } from "../../../main";

import { detectTerrainLayerMaps, getTerrainMapStem, ITerrainDetectedLayerMaps } from "../../../../tools/terrain/core/layer-maps";

import { getTerrainMeshInfo } from "../../../../tools/terrain/engine/info";
import { addTerrainMaterialLayers, createTerrainLayerFromMaterialData, updateTerrainMaterialLayer } from "../../../../tools/terrain/engine/layers";

import { importTerrainSourceFiles, readTerrainPathsFromDataTransfer } from "../../../../tools/terrain/io/sources";

import { setActiveTerrainLayerId, terrainCustomBrushes, updateTerrainSettings } from "./settings";

/** Textures of a layer. */
export type TerrainMapSlotKind = "albedo" | "normal" | "roughness" | "ao" | "height";

/**
 * Where files are dropped in the terrain tool:
 * - "brush-palette": the textures become custom brushes;
 * - "layers-list": the textures create layers (the names of their files give their maps: "rock_albedo.png", "rock_normal.png"...), a
 *   ".material" file creates a layer;
 * - "layer-row": the textures, or the textures of a ".material" file, replace the textures of the layer;
 * - "map-slot": an image becomes the texture of the slot of the layer.
 */
export interface ITerrainDropTarget {
	zone: "brush-palette" | "layers-list" | "layer-row" | "map-slot";
	layerId?: string;
	slot?: TerrainMapSlotKind;
}

type TerrainLayerPatch = Partial<Omit<ITerrainLayerData, "id">>;

/** The textures of the layers are decoded by the browser at runtime, like the images of the palette of brushes: no TIFF. */
const textureExtensions = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];

/**
 * Returns the files of a drop: the files of the system, or the assets dragged from the assets browser. The data of the drop only holds the
 * assets that have the extension of the dragged one, so the whole selection of the browser is returned.
 * To call while the drop event is handled: the data of the drop can't be read afterwards.
 */
export function readTerrainDropPaths(editor: Editor, dataTransfer: DataTransfer): string[] {
	const paths = readTerrainPathsFromDataTransfer(dataTransfer);
	const selection = editor.layout.assets.state.selectedKeys.map((key) => key.replace(/\\/g, "/"));

	if (dataTransfer.types.includes("assets") && paths.some((path) => selection.includes(path))) {
		return Array.from(new Set([...paths, ...selection]));
	}

	return paths;
}

/**
 * Does what the drop of the given files on the given target does (see ITerrainDropTarget).
 * @param paths defines the absolute paths of the dropped files, the folders being replaced by the files they contain.
 */
export async function dropTerrainFiles(editor: Editor, mesh: Mesh, target: ITerrainDropTarget, paths: string[]): Promise<void> {
	const textures = paths.filter((path) => textureExtensions.includes(extname(path).toLowerCase()));
	const material = paths.find((path) => extname(path).toLowerCase() === ".material");

	switch (target.zone) {
		case "brush-palette":
			return addCustomBrushes(textures);

		case "layers-list":
			return material ? addMaterialLayer(editor, mesh, material) : addLayers(editor, mesh, detectTerrainLayerMaps(textures));

		case "layer-row":
			return material ? setMaterialMaps(mesh, target.layerId!, material) : setMaps(mesh, target.layerId!, detectTerrainLayerMaps(textures)[0]);

		case "map-slot":
			return setMaps(mesh, target.layerId!, getSlotMaps(target.slot!, textures[0]));
	}
}

/**
 * Adds the given textures to the palette of brushes and selects the last one.
 */
function addCustomBrushes(paths: string[]): void {
	if (!paths.length) {
		return;
	}

	terrainCustomBrushes.push(...paths.filter((path) => !terrainCustomBrushes.includes(path)));
	updateTerrainSettings((settings) => (settings.brush.brushId = paths[paths.length - 1]));
}

/**
 * Returns the textures of a layer set by one image for the given slot. The name of the file gives the channel that holds the map
 * ("_orm" files hold the occlusion in red and the roughness in green) and the convention of a normal map.
 */
function getSlotMaps(slot: TerrainMapSlotKind, path: string | undefined): Partial<ITerrainDetectedLayerMaps> | undefined {
	if (!path) {
		return undefined;
	}

	const map = getTerrainMapStem(basename(path));

	switch (slot) {
		case "albedo":
			return { albedo: path };

		case "normal":
			return map.variant === "directx" ? { normal: path, normalConvention: "directx" } : { normal: path };

		case "roughness":
			if (map.map === "roughness") {
				return { roughnessMap: path, roughnessChannel: "luminance", roughnessInvert: map.variant === "invert" };
			}

			return map.map === "orm" ? { roughnessMap: path, roughnessChannel: "g", roughnessInvert: false } : { roughnessMap: path };

		case "ao":
			if (map.map === "ao") {
				return { aoMap: path, aoChannel: "luminance" };
			}

			return map.map === "orm" ? { aoMap: path, aoChannel: "r" } : { aoMap: path };

		case "height":
			return map.map === "height" ? { heightMap: path, heightChannel: "luminance" } : { heightMap: path };
	}
}

/**
 * Returns the path, relative to the project, of the given texture of a layer: the layers store paths relative to the project.
 * A file that is outside of the assets of the project is copied in "assets/terrain-textures" first.
 */
async function importTexture(path: string | null | undefined): Promise<string | undefined> {
	if (!path) {
		return undefined;
	}

	const { imported, rejected } = await importTerrainSourceFiles([path]);
	rejected.forEach((file) => toast.error(`Can't use ${basename(file.path)}: ${file.reason}`));

	return imported[0];
}

/**
 * Returns the given textures of a layer as data of the layer, with the channels and the convention that come with the textures.
 */
async function createLayerPatch(maps: Partial<ITerrainDetectedLayerMaps>): Promise<TerrainLayerPatch> {
	const patch: TerrainLayerPatch = {};

	const albedo = await importTexture(maps.albedo);
	if (albedo) {
		patch.albedo = albedo;
	}

	const normal = await importTexture(maps.normal);
	if (normal) {
		patch.normal = normal;
		patch.normalConvention = maps.normalConvention;
	}

	const roughnessMap = await importTexture(maps.roughnessMap);
	if (roughnessMap) {
		patch.roughnessMap = roughnessMap;
		patch.roughnessChannel = maps.roughnessChannel;
		patch.roughnessInvert = maps.roughnessInvert;
	}

	const aoMap = await importTexture(maps.aoMap);
	if (aoMap) {
		patch.aoMap = aoMap;
		patch.aoChannel = maps.aoChannel;
	}

	const heightMap = await importTexture(maps.heightMap);
	if (heightMap) {
		patch.heightMap = heightMap;
		patch.heightChannel = maps.heightChannel;
	}

	return patch;
}

async function setMaps(mesh: Mesh, layerId: string, maps: Partial<ITerrainDetectedLayerMaps> | undefined): Promise<void> {
	const patch = maps ? await createLayerPatch(maps) : {};
	if (Object.keys(patch).length) {
		updateTerrainMaterialLayer(mesh, layerId, patch, { undo: true });
	}
}

async function addLayers(editor: Editor, mesh: Mesh, groups: ITerrainDetectedLayerMaps[]): Promise<void> {
	const layers: Partial<ITerrainLayerData>[] = [];

	// At most 8 layers: the layers that don't fit are not added.
	for (const group of groups.slice(0, 8)) {
		const patch = await createLayerPatch(group);
		if (Object.keys(patch).length) {
			layers.push({ name: group.name, ...patch });
		}
	}

	const layerIds = await addTerrainMaterialLayers(editor, mesh, layers);
	if (layerIds.length < groups.length) {
		toast.warning(`Only ${layerIds.length} layers were added (8 max)`);
	}

	if (layerIds.length) {
		setActiveTerrainLayerId(mesh.material!, layerIds[0]);
	}
}

/**
 * Returns the textures of a PBR or Standard material file as data of a layer, null for other materials.
 */
async function readMaterialLayer(mesh: Mesh, path: string): Promise<Partial<ITerrainLayerData> | null> {
	const info = getTerrainMeshInfo(mesh);
	const layer = createTerrainLayerFromMaterialData(await readJSON(path), { width: info.width, height: info.height });

	if (!layer) {
		toast.warning(`“${basename(path)}” is not a PBR or Standard material.`);
	}

	return layer;
}

async function addMaterialLayer(editor: Editor, mesh: Mesh, path: string): Promise<void> {
	const layer = await readMaterialLayer(mesh, path);
	if (!layer) {
		return;
	}

	const [layerId] = await addTerrainMaterialLayers(editor, mesh, [{ ...layer, name: layer.name || basename(path, extname(path)) }]);
	if (layerId) {
		setActiveTerrainLayerId(mesh.material!, layerId);
	}
}

/**
 * Replaces the textures of the given layer by the ones of the given material: the name and the other settings of the layer are kept.
 */
async function setMaterialMaps(mesh: Mesh, layerId: string, path: string): Promise<void> {
	const layer = await readMaterialLayer(mesh, path);
	if (!layer) {
		return;
	}

	const patch: TerrainLayerPatch = {
		albedo: layer.albedo ?? null,
		normal: layer.normal ?? null,
		roughnessMap: layer.roughnessMap ?? null,
		aoMap: layer.aoMap ?? null,
		heightMap: layer.heightMap ?? null,
		normalConvention: layer.normalConvention,
		roughnessChannel: layer.roughnessChannel,
		roughnessInvert: layer.roughnessInvert,
		aoChannel: layer.aoChannel,
		heightChannel: layer.heightChannel,
	};

	updateTerrainMaterialLayer(mesh, layerId, patch, { undo: true });
}
