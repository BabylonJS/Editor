import { Color3, PBRMaterial, Texture, Tools, type BaseTexture, type Material, type Mesh, type Scene } from "babylonjs";
import {
	cloneTerrainMaterialData,
	createDefaultTerrainLayer,
	createDefaultTerrainMaterialData,
	createTerrainWeightMap,
	getTerrainMaterialPlugin,
	TERRAIN_DATA_VERSION,
	TERRAIN_LAYER_TEXTURE_SIZES,
	TERRAIN_WEIGHT_MAP_SIZES,
	TerrainMaterialPlugin,
	type ITerrainLayerData,
	type ITerrainMaterialData,
} from "babylonjs-editor-tools";

import { toast } from "sonner";

import type { Editor } from "../../../editor/main";
import { getProjectAssetsRootUrl } from "../../../project/configuration";
import { isPBRMaterial, isStandardMaterial } from "../../guards/material";
import { configureSimultaneousLightsForMaterial } from "../../material/material";
import { UniqueNumber } from "../../tools";

import { createTerrainSnapshotPayload } from "../core/journal";
import { resampleTerrainWeightMaps } from "../core/weights";
import { resolveRenamedAssetPath } from "../io/paths";

import { getTerrainEligibility, getTerrainSharedMaterialMeshes } from "./eligibility";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { createTerrainRefusedError, TERRAIN_WEIGHTS_TIMEOUT_MS, waitForTerrainWeightsAsync } from "./operations";
import { getTerrainHeightView } from "./registry";
import { getTerrainStateRefusal } from "./state";
import type { ITerrainMaterialSettingsPatch, TerrainChangeKind, TerrainChangeReason, TerrainStrokeRefusal } from "./types";
import { getTerrainWeightMapDirtyFlags, installTerrainWeightMaps, markTerrainWeightMapDirty, TerrainWeightsBinding } from "./weights-binding";
import { createTerrainBusyScope } from "./yield";

/** Options of getTerrainMutationRefusal. */
export interface ITerrainMutationRefusalOptions {
	/** Accept terrains edited outside the editor whose resolution is unsupported (resize is the fix of that state). */
	allowUnsupportedResolution?: boolean;
	/** Accept terrains created with a newer editor version (default false: "read-only"). */
	allowNewerVersion?: boolean;
	/** Accept any mesh: only the state refusals are checked. */
	skipEligibility?: boolean;
}

/** Material created for a terrain (§5.1). */
export interface ITerrainCreatedMaterial {
	material: PBRMaterial;
	plugin: TerrainMaterialPlugin;
}

/** Options of createTerrainMaterial / createTerrainMaterialFromMaterial. */
export interface ITerrainMaterialCreationOptions {
	/** sRGB tint of the "Base" layer (created materials only; default 0.5 grey). */
	tint?: [number, number, number];
	/** One of TERRAIN_WEIGHT_MAP_SIZES (snapped; default 1024). */
	weightMapSize?: number;
	/** One of TERRAIN_LAYER_TEXTURE_SIZES (snapped; default 1024). */
	layerTextureSize?: number;
}

/**
 * Material assignment of a terrain, swapped by the undo entries of enable/disable texture painting, restore and ensure unique material
 * (§7.1): the material of the mesh plus the session memories of material.ts.
 */
export interface ITerrainMaterialAssignmentState {
	material: Material | null;
	/** Last terrain material remembered for the mesh (null = none). */
	remembered: Material | null;
	/** true when a material replaced by enableTexturePainting is remembered (`replaced` may then be null: "no material"). */
	hasReplaced: boolean;
	replaced: Material | null;
}

/** Keys of the layer data holding project-relative image paths. */
export const TERRAIN_LAYER_PATH_KEYS = ["albedo", "normal", "roughnessMap", "aoMap", "heightMap"] as const;

/** Layer tiling bounds of a layer created from a material (§1.10.3). */
export const TERRAIN_MATERIAL_TILE_SIZE_MIN = 1;
export const TERRAIN_MATERIAL_TILE_SIZE_MAX = 100000;
export const TERRAIN_MATERIAL_DEFAULT_TILE_SIZE = 200;

/** Default tint of the "Base" layer of a created terrain material (§5.1). */
export const TERRAIN_DEFAULT_BASE_TINT: readonly [number, number, number] = [0.5, 0.5, 0.5];

const PBR_MATERIAL_TYPE = "BABYLON.PBRMaterial";
const STANDARD_MATERIAL_TYPE = "BABYLON.StandardMaterial";

/** Last terrain material of each terrain (session, §2.3): eligibility "material-unassigned" and restoreTerrainMaterial. */
const rememberedTerrainMaterials = new WeakMap<Mesh, Material>();
/** Material replaced by enableTexturePainting (session, §5.1): disableTexturePainting assigns it back. */
const replacedMaterials = new WeakMap<Mesh, Material | null>();

// Refusals

/**
 * Refusal of a structural or material mutation of `mesh` (§6.12 "Busy and lock", §7.3), same order as the stroke rules: "playing", then the
 * eligibility ("not-eligible", "unsupported-resolution", "read-only"), then "saving", "busy", "preview-open". Null when allowed.
 * @param editor defines the reference to the editor.
 * @param mesh defines the mesh to mutate.
 * @param options defines what the mutation requires.
 */
export function getTerrainMutationRefusal(editor: Editor, mesh: Mesh, options: ITerrainMutationRefusalOptions = {}): TerrainStrokeRefusal | null {
	const state = getTerrainStateRefusal(editor);
	if (state === "playing") {
		return state;
	}

	if (!options.skipEligibility) {
		const eligibility = getTerrainEligibility(mesh);
		if (!eligibility.eligible) {
			return "not-eligible";
		}

		if (!options.allowUnsupportedResolution && eligibility.warnings.includes("unsupported-resolution")) {
			return "unsupported-resolution";
		}

		if (!options.allowNewerVersion && eligibility.warnings.includes("newer-version")) {
			return "read-only";
		}
	}

	return state;
}

/**
 * Throws the TerrainRefusedError of getTerrainMutationRefusal (§1.17 text) when the mutation is refused.
 * @param editor defines the reference to the editor.
 * @param mesh defines the mesh to mutate.
 * @param options defines what the mutation requires.
 */
export function assertTerrainMutationAllowed(editor: Editor, mesh: Mesh, options: ITerrainMutationRefusalOptions = {}): void {
	const refusal = getTerrainMutationRefusal(editor, mesh, options);
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}
}

/**
 * Returns true when the plugin data was written by a newer editor (version > TERRAIN_DATA_VERSION): the plugin serializes its raw data back
 * only while nothing calls setData/updateLayer (setWeightMapPaths only updates the paths of the raw copy), so the engine never edits it and
 * save and export keep it as loaded (§5.7, §6.4, §6.5, §6.11).
 * @param plugin defines the terrain material plugin.
 */
export function isTerrainPluginDataNewer(plugin: TerrainMaterialPlugin): boolean {
	return typeof plugin.data.version === "number" && plugin.data.version > TERRAIN_DATA_VERSION;
}

// Session memories

/**
 * Last terrain material of the terrain (session, §2.3): the current material when it has the terrain plugin (remembered on the way), else the
 * remembered one while it is alive (still in the scene) — the eligibility context uses it for the "material-unassigned" warning.
 * @param mesh defines the terrain mesh.
 */
export function getTerrainRememberedMaterial(mesh: Mesh): Material | null {
	const current = mesh.material;
	if (current && getTerrainMaterialPlugin(current as any)) {
		rememberedTerrainMaterials.set(mesh, current);
		return current;
	}

	const remembered = rememberedTerrainMaterials.get(mesh) ?? null;
	if (!remembered || !isTerrainMaterialAlive(remembered) || !getTerrainMaterialPlugin(remembered as any)) {
		return null;
	}

	return remembered;
}

/**
 * Material replaced by enableTexturePainting (session, §5.1), null when none is remembered, it was "no material" or it was disposed since.
 * @param mesh defines the terrain mesh.
 */
export function getTerrainReplacedMaterial(mesh: Mesh): Material | null {
	const replaced = replacedMaterials.get(mesh) ?? null;
	return replaced && isTerrainMaterialAlive(replaced) ? replaced : null;
}

/**
 * Returns true while the material is registered in its scene (Babylon removes disposed materials from scene.materials).
 * @param material defines the material to test.
 */
export function isTerrainMaterialAlive(material: Material): boolean {
	const scene = material.getScene();
	return !!scene && !scene.isDisposed && scene.materials.indexOf(material) !== -1;
}

/**
 * Current material assignment of the mesh with the session memories (see ITerrainMaterialAssignmentState).
 * @param mesh defines the terrain mesh.
 */
export function captureTerrainMaterialAssignment(mesh: Mesh): ITerrainMaterialAssignmentState {
	return {
		material: mesh.material ?? null,
		remembered: rememberedTerrainMaterials.get(mesh) ?? null,
		hasReplaced: replacedMaterials.has(mesh),
		replaced: replacedMaterials.get(mesh) ?? null,
	};
}

/**
 * Installs a material assignment (material of the mesh and session memories), e.g. from an undo payload.
 * @param mesh defines the terrain mesh.
 * @param state defines the assignment to install.
 */
export function installTerrainMaterialAssignment(mesh: Mesh, state: ITerrainMaterialAssignmentState): void {
	mesh.material = state.material;

	if (state.remembered) {
		rememberedTerrainMaterials.set(mesh, state.remembered);
	} else {
		rememberedTerrainMaterials.delete(mesh);
	}

	if (state.hasReplaced) {
		replacedMaterials.set(mesh, state.replaced);
	} else {
		replacedMaterials.delete(mesh);
	}
}

/**
 * Disposes the material (and its textures, the terrain plugin's weight maps and arrays included) when no mesh of its scene uses it anymore.
 * Used when an undo entry that kept an unused material alive is released (§6.12 step 9).
 * @param material defines the material created or replaced by a terrain operation.
 */
export function disposeTerrainMaterialIfUnused(material: Material | null): void {
	if (!material || !isTerrainMaterialAlive(material)) {
		return;
	}

	const scene = material.getScene();
	if (scene.meshes.some((mesh) => mesh.material === material)) {
		return;
	}

	material.dispose(false, true);
}

// Material creation (§5.1)

/**
 * Tint of the "Base" layer of a terrain material created for a mesh whose material is `material` (§5.1): PBR albedoColor (linear) converted
 * to sRGB, Standard diffuseColor (already sRGB in Babylon's Standard pipeline), else 0.5 grey.
 * @param material defines the current material of the mesh.
 */
export function getTerrainMaterialTint(material: Material | null | undefined): [number, number, number] {
	if (material && isPBRMaterial(material)) {
		return toTerrainTint(material.albedoColor.toGammaSpace().asArray());
	}

	if (material && isStandardMaterial(material)) {
		return toTerrainTint(material.diffuseColor.asArray());
	}

	return [TERRAIN_DEFAULT_BASE_TINT[0], TERRAIN_DEFAULT_BASE_TINT[1], TERRAIN_DEFAULT_BASE_TINT[2]];
}

/**
 * Snaps a size to the nearest allowed size (TERRAIN_WEIGHT_MAP_SIZES / TERRAIN_LAYER_TEXTURE_SIZES); the fallback when not a finite number.
 * @param value defines the requested size.
 * @param sizes defines the allowed sizes.
 * @param fallback defines the size used when value is not a number.
 */
export function snapTerrainTextureSize(value: number | null | undefined, sizes: readonly number[], fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value) || !sizes.length) {
		return fallback;
	}

	let best = sizes[0];
	for (const size of sizes) {
		if (Math.abs(size - value) < Math.abs(best - value)) {
			best = size;
		}
	}

	return best;
}

/**
 * New terrain material of a mesh (§5.1): a PBRMaterial ("{mesh} Terrain", editor ids, metallic 0, roughness 1, white albedo, irradiance in
 * fragment, 8 simultaneous lights) with a TerrainMaterialPlugin holding one "Base" layer and weight map 0 filled with that layer (path null,
 * dirty since save). The material is NOT assigned.
 * @param mesh defines the terrain mesh (name and scene).
 * @param options defines the tint of the Base layer and the texture sizes.
 */
export function createTerrainMaterial(mesh: Mesh, options: ITerrainMaterialCreationOptions = {}): ITerrainCreatedMaterial {
	const material = new PBRMaterial(`${mesh.name} Terrain`, mesh.getScene());
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	configureTerrainPbrMaterial(material);

	const tint = options.tint ?? TERRAIN_DEFAULT_BASE_TINT;
	const plugin = attachTerrainPlugin(material, [createDefaultTerrainLayer({ name: "Base", tint: toTerrainTint(tint) })], options);

	return { material, plugin };
}

/**
 * Terrain material converted from the current material of a mesh (§5.1 "Convert"), NOT assigned:
 * - PBRMaterial: cloned ("{name} Terrain", every setting kept: lightmap, emissive, intensities, image processing...), its surface maps
 *   (albedo, bump, metallic, ambient) and parallax removed from the clone (they feed layer 1 now), white albedo, metallic 0, roughness 1;
 * - StandardMaterial: a new PBRMaterial with the settings that have a PBR equivalent (lightmap + useLightmapAsShadowmap, emissive color and
 *   texture, alpha, backFaceCulling, twoSidedLighting).
 * Layer 1 comes from createTerrainLayerFromMaterialData (§1.10.3) with the terrain's local size. Returns null for other material types and for
 * materials that already have the terrain plugin.
 * @param mesh defines the terrain mesh (scene).
 * @param source defines the material to convert.
 * @param terrainSize defines the local size (cm) of the terrain, for the layer tiling.
 * @param options defines the texture sizes.
 */
export function createTerrainMaterialFromMaterial(
	mesh: Mesh,
	source: Material,
	terrainSize: { width: number; height: number },
	options: ITerrainMaterialCreationOptions = {}
): ITerrainCreatedMaterial | null {
	if (getTerrainMaterialPlugin(source as any)) {
		return null;
	}

	let material: PBRMaterial;

	if (isPBRMaterial(source)) {
		material = source.clone(`${source.name} Terrain`);

		for (const key of ["albedoTexture", "bumpTexture", "metallicTexture", "ambientTexture"] as const) {
			const texture: BaseTexture | null = material[key];
			material[key] = null;
			texture?.dispose();
		}

		material.useParallax = false;
	} else if (isStandardMaterial(source)) {
		material = new PBRMaterial(`${source.name} Terrain`, mesh.getScene());
		material.lightmapTexture = source.lightmapTexture?.clone() ?? null;
		material.useLightmapAsShadowmap = source.useLightmapAsShadowmap;
		material.emissiveColor = source.emissiveColor.clone();
		material.emissiveTexture = source.emissiveTexture?.clone() ?? null;
		material.alpha = source.alpha;
		material.backFaceCulling = source.backFaceCulling;
		material.twoSidedLighting = source.twoSidedLighting;
	} else {
		return null;
	}

	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();

	configureTerrainPbrMaterial(material);

	const layer = createTerrainLayerFromMaterialData(source.serialize(), terrainSize) ?? {};
	const plugin = attachTerrainPlugin(material, [createDefaultTerrainLayer({ name: "Base", ...layer })], options);

	return { material, plugin };
}

/**
 * PBR material used when texture painting is disabled and the replaced material is gone (§5.1): metallic 0, roughness and tint (linear) of
 * layer 1, albedo and bump textures of layer 1's albedo/normal paths with the terrain tiling (u/vScale = W or H / tileSize, offsets / tileSize,
 * invertNormalMapY for DirectX normals). NOT assigned.
 * @param mesh defines the terrain mesh.
 * @param plugin defines the terrain material plugin whose layer 1 is used.
 */
export function createTerrainLayerFallbackMaterial(mesh: Mesh, plugin: TerrainMaterialPlugin): PBRMaterial {
	const scene = mesh.getScene();
	const layer = plugin.data.layers[0] ?? createDefaultTerrainLayer();
	const size = getTerrainLocalSize(mesh);

	const material = new PBRMaterial(`${mesh.name} Material`, scene);
	material.id = Tools.RandomId();
	material.uniqueId = UniqueNumber.Get();
	material.metallic = 0;
	material.roughness = clamp01(layer.roughness);
	material.albedoColor = Color3.FromArray(toTerrainTint(layer.tint)).toLinearSpace();
	material.invertNormalMapY = layer.normalConvention === "directx";

	configureSimultaneousLightsForMaterial(material);

	const rootUrl = plugin.rootUrl || getProjectAssetsRootUrl() || "";
	material.albedoTexture = createTerrainLayerTexture(scene, rootUrl, layer.albedo, layer, size);
	material.bumpTexture = createTerrainLayerTexture(scene, rootUrl, layer.normal, layer, size);

	return material;
}

// Material operations

/**
 * Returns the existing plugin when the material already has one; otherwise creates the terrain material
 * ("create", or "convert" from the current PBR/Standard material, §5.1), assigns it and registers one undo entry (material swap). The replaced
 * material stays in the scene and is remembered for disableTexturePainting.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param options defines the source of layer 1.
 */
export async function enableTerrainTexturePainting(editor: Editor, mesh: Mesh, options: { from?: "create" | "convert" } = {}): Promise<TerrainMaterialPlugin> {
	const existing = getTerrainMaterialPlugin(mesh.material as any);
	if (existing) {
		return existing;
	}

	assertTerrainMutationAllowed(editor, mesh);

	const current = mesh.material ?? null;
	const converted = options.from === "convert" && current ? createTerrainMaterialFromMaterial(mesh, current, getTerrainLocalSize(mesh)) : null;
	const created = converted ?? createTerrainMaterial(mesh, { tint: getTerrainMaterialTint(current) });

	registerTerrainMaterialSwap(mesh, { material: created.material, remembered: created.material, hasReplaced: true, replaced: current }, "Enable texture painting", {
		kinds: ["material", "layers", "weights"],
		reason: "layers",
		disposeWhenUndone: created.material,
	});

	return created.plugin;
}

/**
 * One undo entry (material swap) assigning the material replaced by enableTexturePainting when
 * it is still alive, else a PBR material built from layer 1. The terrain material stays alive in the entry (its weights are kept while it
 * exists) and is no longer remembered ("material-unassigned" is not reported for a disabled terrain). No-op without terrain material.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export async function disableTerrainTexturePainting(editor: Editor, mesh: Mesh): Promise<void> {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (!plugin) {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { allowNewerVersion: true, allowUnsupportedResolution: true });

	const terrainMaterial = mesh.material;
	const replaced = getTerrainReplacedMaterial(mesh);
	const target = replaced && !getTerrainMaterialPlugin(replaced as any) ? replaced : createTerrainLayerFallbackMaterial(mesh, plugin);

	registerTerrainMaterialSwap(mesh, { material: target, remembered: null, hasReplaced: false, replaced: null }, "Disable texture painting", {
		kinds: ["material", "layers", "weights"],
		reason: "layers",
		disposeWhenUndone: target === replaced ? null : target,
		disposeWhenKept: terrainMaterial,
	});
}

/**
 * Undoable swap back to the remembered terrain material of the terrain (warning "material-unassigned").
 * No-op when nothing is remembered or the terrain material is already assigned.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function restoreTerrainMaterial(editor: Editor, mesh: Mesh): void {
	const remembered = getTerrainRememberedMaterial(mesh);
	if (!remembered || remembered === mesh.material) {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { allowNewerVersion: true, allowUnsupportedResolution: true });

	const current = captureTerrainMaterialAssignment(mesh);
	registerTerrainMaterialSwap(mesh, { ...current, material: remembered, remembered }, "Restore terrain material", {
		kinds: ["material", "layers", "weights"],
		reason: "layers",
	});
}

/**
 * When the terrain material is bound to other meshes, the mesh gets a clone ("{material} ({mesh})",
 * Babylon _clonePlugins + the plugin's copyTo: data, rootUrl and weight bytes), editor ids, 8 simultaneous lights; undoable swap. The clone
 * gets its own weight files at the next save (new file key). No-op when the material is not shared.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function ensureTerrainUniqueMaterial(editor: Editor, mesh: Mesh): void {
	const source = mesh.material;
	if (!source || !getTerrainMaterialPlugin(source as any)) {
		throw createTerrainRefusedError("no-material");
	}

	if (!getTerrainSharedMaterialMeshes(mesh).length) {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { allowNewerVersion: true, allowUnsupportedResolution: true });

	const clone = source.clone(`${source.name} (${mesh.name})`);
	const plugin = clone ? getTerrainMaterialPlugin(clone as any) : null;
	if (!clone || !plugin) {
		clone?.dispose(false, true);
		throw new Error(`The terrain material "${source.name}" couldn't be cloned.`);
	}

	clone.id = Tools.RandomId();
	clone.uniqueId = UniqueNumber.Get();
	configureSimultaneousLightsForMaterial(clone);

	// The copied weights are not saved anywhere yet under the clone's own file key.
	([0, 1] as const).forEach((index) => {
		if (plugin.getWeightMap(index)) {
			markTerrainWeightMapDirty(plugin, index);
		}
	});

	const current = captureTerrainMaterialAssignment(mesh);
	registerTerrainMaterialSwap(mesh, { ...current, material: clone, remembered: clone }, "Make terrain material unique", {
		kinds: ["material"],
		reason: "layers",
		disposeWhenUndone: clone,
	});

	toast.info(`The terrain material is now unique to “${mesh.name}”.`);
}

/**
 * One undo entry `{ data, maps }` (maps only when resampled). A new weight map size resamples
 * the loaded weights (§4.10.7, busy scope "Resampling weights"); maps that are not loaded are resampled by the weights binding when they load.
 * Sizes are snapped to the allowed sizes, anisotropy is an integer 1..16, the transition 0.01..1. No-op when nothing changes.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param patch defines the settings to change.
 */
export async function setTerrainMaterialSettings(editor: Editor, mesh: Mesh, patch: ITerrainMaterialSettingsPatch): Promise<void> {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (!plugin) {
		throw createTerrainRefusedError("no-material");
	}

	assertTerrainMutationAllowed(editor, mesh, { allowUnsupportedResolution: true });
	if (isTerrainPluginDataNewer(plugin)) {
		throw createTerrainRefusedError("read-only");
	}

	const data = plugin.data;
	const next = cloneTerrainMaterialData(data as ITerrainMaterialData);

	if (typeof patch.enabled === "boolean") {
		next.enabled = patch.enabled;
	}
	if (patch.weightMapSize !== undefined) {
		next.weightMapSize = snapTerrainTextureSize(patch.weightMapSize, TERRAIN_WEIGHT_MAP_SIZES, data.weightMapSize);
	}
	if (patch.layerTextureSize !== undefined) {
		next.layerTextureSize = snapTerrainTextureSize(patch.layerTextureSize, TERRAIN_LAYER_TEXTURE_SIZES, data.layerTextureSize);
	}
	if (typeof patch.anisotropy === "number" && Number.isFinite(patch.anisotropy)) {
		next.anisotropy = Math.min(16, Math.max(1, Math.round(patch.anisotropy)));
	}
	if (typeof patch.heightBlend === "boolean") {
		next.heightBlend = patch.heightBlend;
	}
	if (typeof patch.heightBlendTransition === "number" && Number.isFinite(patch.heightBlendTransition)) {
		next.heightBlendTransition = Math.min(1, Math.max(0.01, patch.heightBlendTransition));
	}

	if (JSON.stringify(next) === JSON.stringify(data)) {
		return;
	}

	const resample = next.weightMapSize !== data.weightMapSize;
	const scope = resample ? createTerrainBusyScope("Resampling weights", mesh) : null;

	try {
		let maps: [Uint8Array | null, Uint8Array | null] | null = null;

		if (resample) {
			await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
			scope?.throwIfAborted();

			const weights = TerrainWeightsBinding.acquire(plugin).weights;
			if (weights) {
				const resampled = resampleTerrainWeightMaps(weights.maps, next.weightMapSize);
				maps = [resampled.maps[0], resampled.maps[1]];
			}

			scope?.setProgress(0.9);
		}

		const before = captureTerrainMaterialDataState(plugin, maps !== null);
		installTerrainMaterialDataState(plugin, { data: next, maps });

		const kinds: TerrainChangeKind[] = maps ? ["material", "weights"] : ["material"];
		const payload = createTerrainSnapshotPayload<ITerrainMaterialDataState>({
			state: before,
			byteLength: getTerrainMaterialDataStateBytes(before),
			signature: "",
			exchange: (state) => {
				const previous = captureTerrainMaterialDataState(plugin, state.maps !== null);
				installTerrainMaterialDataState(plugin, state);
				return { previous, changed: {} };
			},
		});

		getTerrainUndoStore().register(mesh, payload, "Terrain material settings", { snapshot: true, kinds });
		notifyTerrainChanged(mesh, kinds, "settings");
	} finally {
		scope?.dispose();
	}
}

/**
 * Sets data.weightMaps[index] to a project-relative PNG path and reloads the weights from it
 * (busy scope "Relinking weights", waits for the load). One undo entry `{ weightMaps paths, maps }`: undo gives back the previous paths and
 * CPU data, and reloads the maps that had none (the map that failed to load fails again: the error state and its banner come back).
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param index defines the weight map index.
 * @param relativePath defines the project-relative path of the PNG file.
 */
export async function relinkTerrainWeightMap(editor: Editor, mesh: Mesh, index: 0 | 1, relativePath: string): Promise<void> {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (!plugin) {
		throw createTerrainRefusedError("no-material");
	}

	const path = normalizeTerrainRelativePath(relativePath);
	if (!path) {
		throw new Error("The weight map path is empty.");
	}

	assertTerrainMutationAllowed(editor, mesh, { allowUnsupportedResolution: true });
	if (isTerrainPluginDataNewer(plugin)) {
		throw createTerrainRefusedError("read-only");
	}

	const scope = createTerrainBusyScope("Relinking weights", mesh);

	try {
		const before = captureTerrainWeightLinkState(plugin);

		const paths: [string | null, string | null] = [plugin.data.weightMaps[0], plugin.data.weightMaps[1]];
		paths[index] = path;

		plugin.setWeightMapPaths(paths);
		plugin.reloadWeightMaps();
		markTerrainWeightMapDirty(plugin, 0, false);
		markTerrainWeightMapDirty(plugin, 1, false);

		await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
		scope.throwIfAborted();

		const payload = createTerrainSnapshotPayload<ITerrainWeightLinkState>({
			state: before,
			byteLength: (before.maps[0]?.byteLength ?? 0) + (before.maps[1]?.byteLength ?? 0),
			signature: "",
			exchange: (state) => {
				const previous = captureTerrainWeightLinkState(plugin);
				installTerrainWeightLinkState(plugin, state);
				return { previous, changed: {} };
			},
		});

		getTerrainUndoStore().register(mesh, payload, "Relink terrain weights", { snapshot: true, kinds: ["weights", "material"] });
		notifyTerrainChanged(mesh, ["weights", "material"], "settings");
	} finally {
		scope.dispose();
	}
}

/**
 * Rewrites the layer source AND weight map paths of every terrain plugin of the scene through the
 * assets cache (resolveRenamedAssetPath, renamed or moved assets). Plugins holding newer data (read-only) are left untouched.
 * @param scene defines the scene whose materials are normalized.
 */
export function normalizeTerrainAssetPaths(scene: Scene): void {
	for (const plugin of getTerrainScenePlugins(scene)) {
		normalizeTerrainPluginAssetPaths(plugin);
	}
}

/**
 * Rewrites the renamed layer source and weight map paths of one plugin (§6.10: called before every layer edit or rebuild).
 * Returns true when a path changed.
 * @param plugin defines the terrain material plugin.
 */
export function normalizeTerrainPluginAssetPaths(plugin: TerrainMaterialPlugin): boolean {
	if (isTerrainPluginDataNewer(plugin)) {
		return false;
	}

	let changed = false;

	const patches: { id: string; patch: Partial<Pick<ITerrainLayerData, (typeof TERRAIN_LAYER_PATH_KEYS)[number]>> }[] = [];
	for (const layer of plugin.data.layers) {
		const patch: Partial<Pick<ITerrainLayerData, (typeof TERRAIN_LAYER_PATH_KEYS)[number]>> = {};
		for (const key of TERRAIN_LAYER_PATH_KEYS) {
			const path = layer[key];
			if (path) {
				const resolved = resolveTerrainAssetPath(path);
				if (resolved !== path) {
					patch[key] = resolved;
				}
			}
		}

		if (Object.keys(patch).length) {
			patches.push({ id: layer.id, patch });
		}
	}

	for (const { id, patch } of patches) {
		plugin.updateLayer(id, patch);
		changed = true;
	}

	const weightMaps = plugin.data.weightMaps;
	const resolvedWeightMaps: [string | null, string | null] = [
		weightMaps[0] ? resolveTerrainAssetPath(weightMaps[0]) : null,
		weightMaps[1] ? resolveTerrainAssetPath(weightMaps[1]) : null,
	];

	if (resolvedWeightMaps[0] !== weightMaps[0] || resolvedWeightMaps[1] !== weightMaps[1]) {
		plugin.setWeightMapPaths(resolvedWeightMaps);
		changed = true;
	}

	return changed;
}

/**
 * A project image changed on disk. Plugins using it as a layer source rebuild their layer arrays
 * (bypassing the decoded-image and array caches); for a weight map file, plugins without unsaved paint reload their weights, the others keep
 * their unsaved paint and log console.weights-external-change.
 * @param scene defines the scene whose materials are checked.
 * @param relativePath defines the project-relative path of the changed file.
 */
export function handleTerrainAssetFileChanged(scene: Scene, relativePath: string): void {
	const target = normalizeTerrainRelativePath(relativePath);
	if (!target) {
		return;
	}

	for (const plugin of getTerrainScenePlugins(scene)) {
		normalizeTerrainPluginAssetPaths(plugin);

		const data = plugin.data;
		if (data.layers.some((layer) => TERRAIN_LAYER_PATH_KEYS.some((key) => normalizeTerrainRelativePath(layer[key]) === target))) {
			plugin.rebuildLayerTextures();
		}

		if (data.weightMaps.some((path) => normalizeTerrainRelativePath(path) === target)) {
			const dirty = getTerrainWeightMapDirtyFlags(plugin);
			if (dirty[0] || dirty[1]) {
				console.warn("[Terrain] Weights changed on disk while unsaved paint exists: keeping the unsaved paint.");
			} else {
				plugin.reloadWeightMaps();
			}
		}
	}
}

// Helpers shared with layers.ts and structure.ts

/**
 * Local size (cm) of the terrain grid: the height view's grid, else the bounding box extents.
 * @param mesh defines the terrain mesh.
 */
export function getTerrainLocalSize(mesh: Mesh): { width: number; height: number } {
	const grid = getTerrainHeightView(mesh)?.grid;
	if (grid) {
		return { width: grid.width, height: grid.height };
	}

	const extend = mesh.getBoundingInfo().boundingBox.extendSize;
	return { width: Math.max(1e-6, extend.x * 2), height: Math.max(1e-6, extend.z * 2) };
}

/**
 * Normalized project-relative path ("/" separators, no leading "./"); null for empty values.
 * @param path defines the path.
 */
export function normalizeTerrainRelativePath(path: string | null | undefined): string | null {
	if (typeof path !== "string") {
		return null;
	}

	const normalized = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");
	return normalized || null;
}

/**
 * Registers an undoable material swap (§7.1 "material assignment"): installs `next`, notifies and registers one snapshot entry whose exchange
 * swaps the whole assignment. `disposeWhenUndone` is disposed (when unused) if the entry is released while undone, `disposeWhenKept` if it is
 * released while applied.
 * @param mesh defines the terrain.
 * @param next defines the assignment to install.
 * @param label defines the undo label.
 * @param options defines the notified kinds, the reason and the materials to dispose on release.
 */
export function registerTerrainMaterialSwap(
	mesh: Mesh,
	next: ITerrainMaterialAssignmentState,
	label: string,
	options: { kinds: TerrainChangeKind[]; reason: TerrainChangeReason; disposeWhenUndone?: Material | null; disposeWhenKept?: Material | null }
): void {
	const before = captureTerrainMaterialAssignment(mesh);
	installTerrainMaterialAssignment(mesh, next);

	const payload = createTerrainSnapshotPayload<ITerrainMaterialAssignmentState>({
		state: before,
		byteLength: 0,
		signature: "",
		exchange: (state) => {
			const previous = captureTerrainMaterialAssignment(mesh);
			installTerrainMaterialAssignment(mesh, state);
			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, label, {
		snapshot: true,
		kinds: options.kinds,
		onRelease: (undone) => disposeTerrainMaterialIfUnused((undone ? options.disposeWhenUndone : options.disposeWhenKept) ?? null),
	});

	notifyTerrainChanged(mesh, options.kinds, options.reason);
}

// createTerrainLayerFromMaterialData (§1.10.3; re-exported by layers.ts, where the contract of §3.5 declares it)

/**
 * Maps a serialized PBRMaterial or StandardMaterial (material JSON or material.serialize()) to layer data (§1.10.3); terrainSize = the target
 * terrain's local W/H (cm) for the tiling. null for other material types.
 * - PBR (customType "BABYLON.PBRMaterial"): albedoTexture → albedo; bumpTexture → normal (invertNormalMapY → DirectX), height = bump channel a
 *   when the bump has alpha and useParallax; metallicTexture → roughness (channel a when useRoughnessFromMetallicTextureAlpha, Babylon's default,
 *   else g) and AO channel r when useAmbientOcclusionFromMetallicTextureRed; ambientTexture → AO; roughness/metallic scalars (null → 1 / 0);
 *   albedo color (linear) → tint (sRGB).
 * - Standard (customType "BABYLON.StandardMaterial" or none, like Babylon's Material.Parse): diffuseTexture → albedo; bumpTexture → normal;
 *   ambientTexture → AO; diffuse color (already sRGB) → tint; roughness 1, metallic 0.
 * - Tiling from the albedo texture (else the first mapped texture): tileSize = [W / |uScale|, H / |vScale|] clamped to [1, 100000] (a zero
 *   scale gives 200), tileOffset = [uOffset × tileSize[0], vOffset × tileSize[1]]. Paths are copied; the name is the material's name.
 * @param data defines the serialized material.
 * @param terrainSize defines the local size (cm) of the target terrain.
 */
export function createTerrainLayerFromMaterialData(data: any, terrainSize: { width: number; height: number }): Partial<ITerrainLayerData> | null {
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		return null;
	}

	const customType = data.customType ?? STANDARD_MATERIAL_TYPE;
	if (customType !== PBR_MATERIAL_TYPE && customType !== STANDARD_MATERIAL_TYPE) {
		return null;
	}

	const layer: Partial<ITerrainLayerData> = {};
	if (typeof data.name === "string" && data.name.trim()) {
		layer.name = data.name;
	}

	const tilingSources: any[] = [];
	const addPath = (texture: any): string | null => {
		const path = getSerializedTexturePath(texture);
		if (path) {
			tilingSources.push(texture);
		}
		return path;
	};

	// Every map slot is explicit (null when absent): the result also replaces the maps of an existing layer (§1.10 ".material on a row").
	layer.roughnessMap = null;
	layer.aoMap = null;
	layer.heightMap = null;

	const normal = addPath(data.bumpTexture);
	layer.normal = normal;
	layer.normalConvention = data.invertNormalMapY === true ? "directx" : "opengl";

	if (customType === PBR_MATERIAL_TYPE) {
		layer.albedo = getSerializedTexturePath(data.albedoTexture);
		if (layer.albedo) {
			tilingSources.unshift(data.albedoTexture);
		}

		if (normal && data.bumpTexture?.hasAlpha === true && data.useParallax === true) {
			layer.heightMap = normal;
			layer.heightChannel = "a";
		}

		const metallic = addPath(data.metallicTexture);
		if (metallic) {
			layer.roughnessMap = metallic;
			layer.roughnessChannel = data.useRoughnessFromMetallicTextureAlpha !== false ? "a" : "g";
			layer.roughnessInvert = false;

			if (data.useAmbientOcclusionFromMetallicTextureRed === true) {
				layer.aoMap = metallic;
				layer.aoChannel = "r";
			}
		}

		const ambient = addPath(data.ambientTexture);
		if (ambient) {
			layer.aoMap = ambient;
			layer.aoChannel = "r";
		}

		layer.roughness = typeof data.roughness === "number" ? clamp01(data.roughness) : 1;
		layer.metallic = typeof data.metallic === "number" ? clamp01(data.metallic) : 0;

		const albedoColor = readSerializedColor(data.albedo ?? data.albedoColor);
		if (albedoColor) {
			layer.tint = toTerrainTint(albedoColor.toGammaSpace().asArray());
		}
	} else {
		layer.albedo = getSerializedTexturePath(data.diffuseTexture);
		if (layer.albedo) {
			tilingSources.unshift(data.diffuseTexture);
		}

		const ambient = addPath(data.ambientTexture);
		if (ambient) {
			layer.aoMap = ambient;
			layer.aoChannel = "r";
		}

		layer.roughness = 1;
		layer.metallic = 0;

		const diffuseColor = readSerializedColor(data.diffuse ?? data.diffuseColor);
		if (diffuseColor) {
			layer.tint = toTerrainTint(diffuseColor.asArray());
		}
	}

	const tiling = tilingSources[0];
	if (tiling && terrainSize.width > 0 && terrainSize.height > 0) {
		const tileX = getTileSize(terrainSize.width, tiling.uScale);
		const tileZ = getTileSize(terrainSize.height, tiling.vScale);

		layer.tileSize = [tileX, tileZ];
		layer.tileOffset = [getFiniteNumber(tiling.uOffset) * tileX, getFiniteNumber(tiling.vOffset) * tileZ];
	}

	return layer;
}

// Internals

interface ITerrainMaterialDataState {
	data: ITerrainMaterialData;
	/** null: the weight maps are not part of the state (settings that don't resample). */
	maps: [Uint8Array | null, Uint8Array | null] | null;
}

interface ITerrainWeightLinkState {
	paths: [string | null, string | null];
	maps: [Uint8Array | null, Uint8Array | null];
}

function configureTerrainPbrMaterial(material: PBRMaterial): void {
	// Non-null metallic/roughness enable METALLICWORKFLOW (CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS exists, §5.1).
	material.metallic = 0;
	material.roughness = 1;
	material.albedoColor = Color3.White();
	// Diffuse IBL follows the perturbed normal.
	material.forceIrradianceInFragment = true;

	configureSimultaneousLightsForMaterial(material);
}

function attachTerrainPlugin(material: PBRMaterial, layers: ITerrainLayerData[], options: ITerrainMaterialCreationOptions): TerrainMaterialPlugin {
	const defaults = createDefaultTerrainMaterialData();
	const weightMapSize = snapTerrainTextureSize(options.weightMapSize, TERRAIN_WEIGHT_MAP_SIZES, defaults.weightMapSize);
	const layerTextureSize = snapTerrainTextureSize(options.layerTextureSize, TERRAIN_LAYER_TEXTURE_SIZES, defaults.layerTextureSize);

	// Never RegisterMaterialPlugin (global): the plugin is attached to this material only.
	const plugin = new TerrainMaterialPlugin(material as any);
	plugin.rootUrl = getProjectAssetsRootUrl() ?? "";
	plugin.setData({ ...defaults, weightMapSize, layerTextureSize, layers });
	plugin.setWeightMap(0, createTerrainWeightMap(weightMapSize, 0));

	// §6.2: map 0 with layer 1 everywhere, path null, dirty (written at the next save).
	markTerrainWeightMapDirty(plugin, 0);

	return plugin;
}

function createTerrainLayerTexture(scene: Scene, rootUrl: string, path: string | null, layer: ITerrainLayerData, size: { width: number; height: number }): Texture | null {
	const relativePath = normalizeTerrainRelativePath(path);
	if (!relativePath) {
		return null;
	}

	const texture = new Texture(`${rootUrl}${resolveTerrainAssetPath(relativePath)}`, scene);
	// Project-relative name and url, like configureImportedTexture: the scene serializes the relative path.
	texture.name = relativePath;
	texture.url = relativePath;

	const tileX = layer.tileSize[0] > 0 ? layer.tileSize[0] : TERRAIN_MATERIAL_DEFAULT_TILE_SIZE;
	const tileZ = layer.tileSize[1] > 0 ? layer.tileSize[1] : TERRAIN_MATERIAL_DEFAULT_TILE_SIZE;

	texture.uScale = size.width / tileX;
	texture.vScale = size.height / tileZ;
	texture.uOffset = layer.tileOffset[0] / tileX;
	texture.vOffset = layer.tileOffset[1] / tileZ;

	return texture;
}

function captureTerrainMaterialDataState(plugin: TerrainMaterialPlugin, withMaps: boolean): ITerrainMaterialDataState {
	return {
		data: cloneTerrainMaterialData(plugin.data as ITerrainMaterialData),
		maps: withMaps ? [plugin.getWeightMap(0)?.data ?? null, plugin.getWeightMap(1)?.data ?? null] : null,
	};
}

/** Installs data (deep-copied by setData) and, when present, the maps (ownership transferred: the state never touches them again). */
function installTerrainMaterialDataState(plugin: TerrainMaterialPlugin, state: ITerrainMaterialDataState): void {
	plugin.setData(cloneTerrainMaterialData(state.data));

	if (state.maps) {
		([0, 1] as const).forEach((index) => {
			const data = state.maps![index];
			plugin.setWeightMap(index, data ? { size: getWeightMapSize(data), data } : null);
			if (data) {
				markTerrainWeightMapDirty(plugin, index);
			}
		});
	}
}

function getTerrainMaterialDataStateBytes(state: ITerrainMaterialDataState): number {
	return (state.maps?.[0]?.byteLength ?? 0) + (state.maps?.[1]?.byteLength ?? 0) + JSON.stringify(state.data).length;
}

/** Copies of the CPU data: reloadWeightMaps doesn't replace the arrays synchronously, so the state can't take them over. */
function captureTerrainWeightLinkState(plugin: TerrainMaterialPlugin): ITerrainWeightLinkState {
	const copy = (index: 0 | 1): Uint8Array | null => {
		const map = plugin.getWeightMap(index);
		return map ? new Uint8Array(map.data) : null;
	};

	return {
		paths: [plugin.data.weightMaps[0], plugin.data.weightMaps[1]],
		maps: [copy(0), copy(1)],
	};
}

/**
 * Paths first, then the CPU data (the state's copies are handed over); a map with a path but no data (e.g. the map that failed to load
 * before a relink) is reloaded from its path, so the error state and its banner come back (installTerrainWeightMaps).
 */
function installTerrainWeightLinkState(plugin: TerrainMaterialPlugin, state: ITerrainWeightLinkState): void {
	installTerrainWeightMaps(plugin, state.paths, state.maps);

	([0, 1] as const).forEach((index) => {
		markTerrainWeightMapDirty(plugin, index, !!state.maps[index]);
	});
}

function getTerrainScenePlugins(scene: Scene): TerrainMaterialPlugin[] {
	const plugins: TerrainMaterialPlugin[] = [];
	for (const material of scene.materials) {
		const plugin = getTerrainMaterialPlugin(material as any);
		if (plugin && plugins.indexOf(plugin) === -1) {
			plugins.push(plugin);
		}
	}

	return plugins;
}

function resolveTerrainAssetPath(path: string): string {
	try {
		return resolveRenamedAssetPath(path) || path;
	} catch (e) {
		// The assets cache is not available (no project): the path is kept.
		return path;
	}
}

function getWeightMapSize(data: Uint8Array): number {
	return Math.round(Math.sqrt(data.length / 4));
}

function getSerializedTexturePath(texture: any): string | null {
	const name = texture?.name;
	if (typeof name !== "string" || !name.trim()) {
		return null;
	}

	return name.replace(/\\/g, "/");
}

function readSerializedColor(value: unknown): Color3 | null {
	if (!Array.isArray(value) || value.length < 3 || !value.slice(0, 3).every((component) => typeof component === "number" && Number.isFinite(component))) {
		return null;
	}

	return new Color3(value[0], value[1], value[2]);
}

function getTileSize(size: number, scale: unknown): number {
	const value = Math.abs(getFiniteNumber(scale, 1));
	if (value < 1e-9) {
		return TERRAIN_MATERIAL_DEFAULT_TILE_SIZE;
	}

	return Math.min(TERRAIN_MATERIAL_TILE_SIZE_MAX, Math.max(TERRAIN_MATERIAL_TILE_SIZE_MIN, size / value));
}

function getFiniteNumber(value: unknown, fallback: number = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toTerrainTint(values: ArrayLike<number>): [number, number, number] {
	return [clamp01(values[0]), clamp01(values[1]), clamp01(values[2])];
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
