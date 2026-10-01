import type { Mesh } from "babylonjs";
import {
	cloneTerrainMaterialData,
	createDefaultTerrainLayer,
	createTerrainLayerId,
	getTerrainMaterialPlugin,
	TERRAIN_LAYERS_PER_WEIGHT_MAP,
	TERRAIN_MAX_LAYERS,
	type ITerrainLayerData,
	type ITerrainMaterialData,
	type TerrainMapChannel,
	type TerrainMaterialPlugin,
	type TerrainNormalConvention,
} from "babylonjs-editor-tools";

import type { Editor } from "../../../editor/main";

import { createTerrainSnapshotPayload } from "../core/journal";
import { createTerrainWeightMaps, insertTerrainLayer, moveTerrainLayer, removeTerrainLayer } from "../core/weights";
import type { ITerrainAutoPaintRule, ITerrainWeightMaps } from "../core/types";

import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import {
	assertTerrainMutationAllowed,
	enableTerrainTexturePainting,
	isTerrainPluginDataNewer,
	normalizeTerrainPluginAssetPaths,
	normalizeTerrainRelativePath,
	TERRAIN_LAYER_PATH_KEYS,
} from "./material";
import { createTerrainRefusedError, TERRAIN_WEIGHTS_TIMEOUT_MS, waitForTerrainWeightsAsync } from "./operations";
import { readTerrainAutoPaintRules } from "./stroke";
import type { ITerrainLayerProxy, ITerrainUpdateLayerOptions, TerrainChangeKind } from "./types";
import { markTerrainWeightMapDirty, TerrainWeightsBinding } from "./weights-binding";
import { createTerrainBusyScope } from "./yield";

// §3.5: "layers.ts also exports createTerrainLayerFromMaterialData" (implemented next to the material conversion that uses it).
export { createTerrainLayerFromMaterialData } from "./material";

/** Layer data without its id (patches of updateLayer and addLayers). */
export type TerrainLayerPatch = Partial<Omit<ITerrainLayerData, "id">>;

/** Message of the error thrown when a 9th layer is requested (§1.10 "Add layer" tooltip). */
export const TERRAIN_MAX_LAYERS_MESSAGE = "8 layers maximum (2 weight maps).";

const TERRAIN_MAP_CHANNELS: readonly TerrainMapChannel[] = ["r", "g", "b", "a", "luminance"];
const TERRAIN_NORMAL_CONVENTIONS: readonly TerrainNormalConvention[] = ["opengl", "directx"];
const TERRAIN_LAYER_ID_PATTERN = /^l-[0-9a-f]{8}$/;

/** Layer data and weight maps swapped by the undo entries of the layer operations (§7.1 "add / remove / move / duplicate layer"). */
interface ITerrainLayerState {
	data: ITerrainMaterialData;
	maps: [Uint8Array | null, Uint8Array | null];
}

/** Result of a layer structure change: the new data, the remapped weights and the value returned to the caller. */
interface ITerrainLayerChange<T> {
	data: ITerrainMaterialData;
	maps: ITerrainWeightMaps;
	result: T;
}

/**
 * Adds layers (at options.index, default at the end; new layers have no weight) and returns their ids.
 * Texture painting is enabled first when the terrain has no terrain material (its own undo entry, "Base" layer first). At most 8 layers:
 * the layers that don't fit are not added (the returned ids tell how many were). One undo entry `{ data, maps }`; map 1 is created (zeros,
 * path null) when the 5th layer arrives.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layers defines the new layers (missing fields get the defaults of createDefaultTerrainLayer, a valid unused id is kept).
 * @param options defines the insertion index.
 */
export async function addTerrainMaterialLayers(editor: Editor, mesh: Mesh, layers: Partial<ITerrainLayerData>[], options: { index?: number } = {}): Promise<string[]> {
	assertTerrainMutationAllowed(editor, mesh);

	if (!layers.length) {
		return [];
	}

	const plugin = getTerrainMaterialPlugin(mesh.material as any) ?? (await enableTerrainTexturePainting(editor, mesh, { from: "create" }));
	assertTerrainLayersEditable(plugin);

	const ids = await changeTerrainLayers(mesh, plugin, "Adding layers", layers.length > 1 ? "Add terrain layers" : "Add terrain layer", (data, weights) => {
		const count = data.layers.length;
		const added = layers.slice(0, Math.max(0, TERRAIN_MAX_LAYERS - count));
		if (!added.length) {
			return null;
		}

		const index = clampIndex(options.index ?? count, count);
		const usedIds = new Set(data.layers.map((layer) => layer.id));
		const newLayers = added.map((partial, offset) => createTerrainLayer(partial, usedIds, `Layer ${index + offset + 1}`));

		data.layers.splice(index, 0, ...newLayers);

		let maps = weights;
		if (maps) {
			for (let offset = 0; offset < newLayers.length; ++offset) {
				maps = insertTerrainLayer(maps, index + offset);
			}
		} else {
			// A terrain material without layer: the first new layer covers the terrain.
			maps = createTerrainWeightMaps(data.weightMapSize, data.layers.length, 0);
		}

		return { data, maps, result: newLayers.map((layer) => layer.id) };
	});

	return ids ?? [];
}

/**
 * Its weight goes to the other layers proportionally (layer 1 when they are all 0), its auto-paint rule
 * is removed; map 1 is dropped (path null) when 4 layers or less remain. Refused (TerrainRefusedError "no-layer") for the last layer and
 * unknown ids. One undo entry.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layerId defines the layer to remove.
 */
export async function removeTerrainMaterialLayer(editor: Editor, mesh: Mesh, layerId: string): Promise<void> {
	assertTerrainMutationAllowed(editor, mesh);

	const plugin = getRequiredTerrainPlugin(mesh);
	assertTerrainLayersEditable(plugin);

	if (plugin.data.layers.length <= 1 || !plugin.data.layers.some((layer) => layer.id === layerId)) {
		throw createTerrainRefusedError("no-layer");
	}

	await changeTerrainLayers(mesh, plugin, "Removing layer", "Remove terrain layer", (data, weights) => {
		const index = data.layers.findIndex((layer) => layer.id === layerId);
		if (index === -1 || data.layers.length <= 1 || !weights) {
			throw createTerrainRefusedError("no-layer");
		}

		data.layers.splice(index, 1);
		removeTerrainAutoPaintRule(data, layerId);

		return { data, maps: removeTerrainLayer(weights, index), result: null };
	});
}

/**
 * Array move of the layer to toIndex (clamped), channel permutation of the weights. One undo entry; no-op
 * when the layer is already there. TerrainRefusedError "no-layer" for an unknown id.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layerId defines the layer to move.
 * @param toIndex defines its new index.
 */
export async function moveTerrainMaterialLayer(editor: Editor, mesh: Mesh, layerId: string, toIndex: number): Promise<void> {
	assertTerrainMutationAllowed(editor, mesh);

	const plugin = getRequiredTerrainPlugin(mesh);
	assertTerrainLayersEditable(plugin);

	const from = plugin.data.layers.findIndex((layer) => layer.id === layerId);
	if (from === -1) {
		throw createTerrainRefusedError("no-layer");
	}

	if (clampIndex(toIndex, plugin.data.layers.length - 1) === from) {
		return;
	}

	await changeTerrainLayers(mesh, plugin, "Moving layer", "Move terrain layer", (data, weights) => {
		const index = data.layers.findIndex((layer) => layer.id === layerId);
		const to = clampIndex(toIndex, data.layers.length - 1);
		if (index === -1 || !weights) {
			throw createTerrainRefusedError("no-layer");
		}

		if (to === index) {
			return null;
		}

		const [layer] = data.layers.splice(index, 1);
		data.layers.splice(to, 0, layer);

		return { data, maps: moveTerrainLayer(weights, index, to), result: null };
	});
}

/**
 * A copy of the layer ("{name} copy", new id) inserted right after it, without weight (paint it). One undo entry.
 * Throws when the material already has 8 layers; TerrainRefusedError "no-layer" for an unknown id.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layerId defines the layer to duplicate.
 */
export async function duplicateTerrainMaterialLayer(editor: Editor, mesh: Mesh, layerId: string): Promise<string> {
	assertTerrainMutationAllowed(editor, mesh);

	const plugin = getRequiredTerrainPlugin(mesh);
	assertTerrainLayersEditable(plugin);

	if (!plugin.data.layers.some((layer) => layer.id === layerId)) {
		throw createTerrainRefusedError("no-layer");
	}

	if (plugin.data.layers.length >= TERRAIN_MAX_LAYERS) {
		throw new Error(TERRAIN_MAX_LAYERS_MESSAGE);
	}

	const id = await changeTerrainLayers(mesh, plugin, "Duplicating layer", "Duplicate terrain layer", (data, weights) => {
		const index = data.layers.findIndex((layer) => layer.id === layerId);
		if (index === -1 || !weights) {
			throw createTerrainRefusedError("no-layer");
		}

		if (data.layers.length >= TERRAIN_MAX_LAYERS) {
			throw new Error(TERRAIN_MAX_LAYERS_MESSAGE);
		}

		const source = data.layers[index];
		const usedIds = new Set(data.layers.map((layer) => layer.id));
		const copy: ITerrainLayerData = { ...JSON.parse(JSON.stringify(source)), id: createUniqueTerrainLayerId(usedIds), name: `${source.name} copy` };

		data.layers.splice(index + 1, 0, copy);

		return { data, maps: insertTerrainLayer(weights, index + 1), result: copy.id };
	});

	if (!id) {
		throw createTerrainRefusedError("no-layer");
	}

	return id;
}

/**
 * Patches one layer (values sanitized like the plugin parser: ranges clamped, enums validated, paths
 * normalized; invalid values are ignored). Without undo (default) it notifies reason "layer-edit" (live field edits); with `undo: true` it
 * registers one undo entry (previous values from `options.previous` or the current data) and notifies reason "layers". No-op for an unknown
 * layer id. Refused for terrains created with a newer editor (read-only data).
 * @param mesh defines the terrain.
 * @param layerId defines the layer to patch.
 * @param patch defines the new values.
 * @param options defines whether an undo entry is registered and the previous values.
 */
export function updateTerrainMaterialLayer(mesh: Mesh, layerId: string, patch: TerrainLayerPatch, options: ITerrainUpdateLayerOptions = {}): void {
	const plugin = getRequiredTerrainPlugin(mesh);
	assertTerrainLayersEditable(plugin);

	if (!plugin.data.layers.some((layer) => layer.id === layerId)) {
		return;
	}

	const values = sanitizeTerrainLayerPatch(patch);
	const keys = Object.keys(values) as (keyof TerrainLayerPatch)[];
	if (!keys.length) {
		return;
	}

	normalizeTerrainPluginAssetPaths(plugin);

	const layer = plugin.data.layers.find((item) => item.id === layerId)!;
	const previousValues = options.undo ? pickTerrainLayerValues(layer, keys, options.previous) : null;

	plugin.updateLayer(layerId, values);

	if (!previousValues) {
		notifyTerrainChanged(mesh, ["layers"], "layer-edit");
		return;
	}

	const payload = createTerrainSnapshotPayload<TerrainLayerPatch>({
		state: previousValues,
		byteLength: 0,
		signature: "",
		exchange: (state) => {
			const current = plugin.data.layers.find((item) => item.id === layerId);
			const previous = current ? pickTerrainLayerValues(current, Object.keys(state) as (keyof TerrainLayerPatch)[]) : state;

			plugin.updateLayer(layerId, JSON.parse(JSON.stringify(state)));
			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, "Edit terrain layer", { snapshot: true, kinds: ["layers"] });
	notifyTerrainChanged(mesh, ["layers"], "layers");
}

/**
 * A new flat, field-friendly view of one layer per call. Getters read the current layer data (the last
 * known values once the layer is removed); each property set calls updateLayer(mesh, id, patch, { undo: false }) (reason "layer-edit"), so
 * inspector fields register their own undo on the proxy (registerSimpleUndoRedo replays through the setters). Tuples are flat
 * (tileSizeX/tileSizeZ, tileOffsetX/tileOffsetZ): never dotted paths.
 * @param mesh defines the terrain.
 * @param layerId defines the layer.
 */
export function createTerrainLayerProxy(mesh: Mesh, layerId: string): ITerrainLayerProxy {
	const layer = getRequiredTerrainPlugin(mesh).data.layers.find((item) => item.id === layerId);
	if (!layer) {
		throw createTerrainRefusedError("no-layer");
	}

	return new TerrainLayerProxy(mesh, layer);
}

/**
 * The rules stored in the terrain material (data.editor.autoPaintRules, §1.10.1), [] without terrain material.
 * @param mesh defines the terrain.
 */
export function getTerrainAutoPaintRules(mesh: Mesh): ITerrainAutoPaintRule[] {
	return readTerrainAutoPaintRules(getTerrainMaterialPlugin(mesh.material as any));
}

/**
 * Replaces the stored rules (sanitized: one rule per layer, the first one; ranges clamped) in one undo
 * entry (plugin.data.editor.autoPaintRules). Refused for terrains created with a newer editor.
 * @param mesh defines the terrain.
 * @param rules defines the rules keyed by layer id.
 */
export function setTerrainAutoPaintRules(mesh: Mesh, rules: ITerrainAutoPaintRule[]): void {
	const plugin = getRequiredTerrainPlugin(mesh);
	assertTerrainLayersEditable(plugin);

	const before = getStoredTerrainAutoPaintRules(plugin);
	installTerrainAutoPaintRules(plugin, sanitizeTerrainAutoPaintRules(rules));

	const payload = createTerrainSnapshotPayload<unknown>({
		state: before,
		byteLength: 0,
		signature: "",
		exchange: (state) => {
			const previous = getStoredTerrainAutoPaintRules(plugin);
			installTerrainAutoPaintRules(plugin, state);
			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, "Set auto-paint rules", { snapshot: true, kinds: ["layers"] });
	notifyTerrainChanged(mesh, ["layers"], "layers");
}

/**
 * Sanitizes a layer patch like the plugin parser (§5.7): name string; paths normalized ("/" separators) or null; enums validated; tint 3 values
 * clamped to 0..1; tileSize >= 1; tileOffset finite; roughness, metallic, aoStrength 0..1; normalStrength, heightScale 0..2; heightOffset -1..1.
 * Invalid values are dropped from the result.
 * @param patch defines the patch to sanitize.
 */
export function sanitizeTerrainLayerPatch(patch: TerrainLayerPatch): TerrainLayerPatch {
	const result: TerrainLayerPatch = {};
	if (!patch || typeof patch !== "object") {
		return result;
	}

	if (typeof patch.name === "string") {
		result.name = patch.name;
	}

	for (const key of TERRAIN_LAYER_PATH_KEYS) {
		const value = patch[key];
		if (value === null || typeof value === "string") {
			result[key] = normalizeTerrainRelativePath(value);
		}
	}

	if (patch.normalConvention !== undefined && TERRAIN_NORMAL_CONVENTIONS.includes(patch.normalConvention)) {
		result.normalConvention = patch.normalConvention;
	}

	for (const key of ["roughnessChannel", "aoChannel", "heightChannel"] as const) {
		const value = patch[key];
		if (value !== undefined && TERRAIN_MAP_CHANNELS.includes(value)) {
			result[key] = value;
		}
	}

	if (typeof patch.roughnessInvert === "boolean") {
		result.roughnessInvert = patch.roughnessInvert;
	}

	const tint = readNumbers(patch.tint, 3);
	if (tint) {
		result.tint = [clamp(tint[0], 0, 1), clamp(tint[1], 0, 1), clamp(tint[2], 0, 1)];
	}

	const tileSize = readNumbers(patch.tileSize, 2);
	if (tileSize) {
		result.tileSize = [Math.max(1, tileSize[0]), Math.max(1, tileSize[1])];
	}

	const tileOffset = readNumbers(patch.tileOffset, 2);
	if (tileOffset) {
		result.tileOffset = [tileOffset[0], tileOffset[1]];
	}

	for (const [key, min, max] of [
		["roughness", 0, 1],
		["metallic", 0, 1],
		["aoStrength", 0, 1],
		["normalStrength", 0, 2],
		["heightScale", 0, 2],
		["heightOffset", -1, 1],
	] as const) {
		const value = patch[key];
		if (typeof value === "number" && Number.isFinite(value)) {
			result[key] = clamp(value, min, max);
		}
	}

	return result;
}

/**
 * Sanitizes auto-paint rules (§1.10.1): entries without a string layerId are dropped, one rule per layer (the first one); enabled boolean
 * (default true); height band finite (min <= max), feather >= 0; slope band 0..90 degrees, feather >= 0; noise scale > 0 (else no noise),
 * amount 0..1, integer seed; opacity 0..1 (default 1).
 * @param rules defines the rules to sanitize.
 */
export function sanitizeTerrainAutoPaintRules(rules: readonly ITerrainAutoPaintRule[]): ITerrainAutoPaintRule[] {
	const result: ITerrainAutoPaintRule[] = [];
	const layers = new Set<string>();

	for (const rule of Array.isArray(rules) ? rules : []) {
		if (!rule || typeof rule !== "object" || typeof rule.layerId !== "string" || layers.has(rule.layerId)) {
			continue;
		}

		layers.add(rule.layerId);

		const height = rule.height && readNumbers([rule.height.minWorld, rule.height.maxWorld, rule.height.featherWorld], 3);
		const slope = rule.slope && readNumbers([rule.slope.minDegrees, rule.slope.maxDegrees, rule.slope.featherDegrees], 3);
		const noise = rule.noise && readNumbers([rule.noise.scale, rule.noise.amount, rule.noise.seed], 3);

		result.push({
			layerId: rule.layerId,
			enabled: typeof rule.enabled === "boolean" ? rule.enabled : true,
			height: height ? { minWorld: Math.min(height[0], height[1]), maxWorld: Math.max(height[0], height[1]), featherWorld: Math.max(0, height[2]) } : null,
			slope: slope
				? {
						minDegrees: clamp(Math.min(slope[0], slope[1]), 0, 90),
						maxDegrees: clamp(Math.max(slope[0], slope[1]), 0, 90),
						featherDegrees: Math.max(0, slope[2]),
					}
				: null,
			noise: noise && noise[0] > 0 ? { scale: noise[0], amount: clamp(noise[1], 0, 1), seed: Math.round(noise[2]) } : null,
			opacity: typeof rule.opacity === "number" && Number.isFinite(rule.opacity) ? clamp(rule.opacity, 0, 1) : 1,
		});
	}

	return result;
}

/**
 * Flat proxy of one layer (see createTerrainLayerProxy).
 */
class TerrainLayerProxy implements ITerrainLayerProxy {
	public readonly id: string;

	private readonly _mesh: Mesh;
	private _last: ITerrainLayerData;

	public constructor(mesh: Mesh, layer: ITerrainLayerData) {
		this.id = layer.id;

		this._mesh = mesh;
		this._last = JSON.parse(JSON.stringify(layer));
	}

	public get name(): string {
		return this._layer.name;
	}

	public set name(value: string) {
		this._update({ name: value });
	}

	public get normalConvention(): TerrainNormalConvention {
		return this._layer.normalConvention;
	}

	public set normalConvention(value: TerrainNormalConvention) {
		this._update({ normalConvention: value });
	}

	public get roughnessChannel(): TerrainMapChannel {
		return this._layer.roughnessChannel;
	}

	public set roughnessChannel(value: TerrainMapChannel) {
		this._update({ roughnessChannel: value });
	}

	public get roughnessInvert(): boolean {
		return this._layer.roughnessInvert;
	}

	public set roughnessInvert(value: boolean) {
		this._update({ roughnessInvert: value });
	}

	public get aoChannel(): TerrainMapChannel {
		return this._layer.aoChannel;
	}

	public set aoChannel(value: TerrainMapChannel) {
		this._update({ aoChannel: value });
	}

	public get heightChannel(): TerrainMapChannel {
		return this._layer.heightChannel;
	}

	public set heightChannel(value: TerrainMapChannel) {
		this._update({ heightChannel: value });
	}

	public get tileSizeX(): number {
		return this._layer.tileSize[0];
	}

	public set tileSizeX(value: number) {
		this._update({ tileSize: [value, this._layer.tileSize[1]] });
	}

	public get tileSizeZ(): number {
		return this._layer.tileSize[1];
	}

	public set tileSizeZ(value: number) {
		this._update({ tileSize: [this._layer.tileSize[0], value] });
	}

	public get tileOffsetX(): number {
		return this._layer.tileOffset[0];
	}

	public set tileOffsetX(value: number) {
		this._update({ tileOffset: [value, this._layer.tileOffset[1]] });
	}

	public get tileOffsetZ(): number {
		return this._layer.tileOffset[1];
	}

	public set tileOffsetZ(value: number) {
		this._update({ tileOffset: [this._layer.tileOffset[0], value] });
	}

	public get roughness(): number {
		return this._layer.roughness;
	}

	public set roughness(value: number) {
		this._update({ roughness: value });
	}

	public get metallic(): number {
		return this._layer.metallic;
	}

	public set metallic(value: number) {
		this._update({ metallic: value });
	}

	public get normalStrength(): number {
		return this._layer.normalStrength;
	}

	public set normalStrength(value: number) {
		this._update({ normalStrength: value });
	}

	public get aoStrength(): number {
		return this._layer.aoStrength;
	}

	public set aoStrength(value: number) {
		this._update({ aoStrength: value });
	}

	public get heightScale(): number {
		return this._layer.heightScale;
	}

	public set heightScale(value: number) {
		this._update({ heightScale: value });
	}

	public get heightOffset(): number {
		return this._layer.heightOffset;
	}

	public set heightOffset(value: number) {
		this._update({ heightOffset: value });
	}

	/** Current data of the layer (plugin of the mesh's current material), else the last values seen. */
	private get _layer(): Readonly<ITerrainLayerData> {
		const layer = getTerrainMaterialPlugin(this._mesh.material as any)?.data.layers.find((item) => item.id === this.id);
		if (layer) {
			this._last = layer;
		}

		return this._last;
	}

	private _update(patch: TerrainLayerPatch): void {
		try {
			updateTerrainMaterialLayer(this._mesh, this.id, patch, { undo: false });
		} catch (e) {
			// Field setters must never throw into the inspector (§1.2).
			console.error(`[Terrain] ${e instanceof Error ? e.message : String(e)}`);
		}
	}
}

/**
 * Common part of the layer structure operations: busy scope, paths normalized (§6.10), loaded weights (waits for a pending load;
 * "weights-loading" / "weights-error" refusals), `change` computes the new data and the remapped weights from copies (null = nothing to do),
 * then the new state is installed (maps handed over to the plugin, dirty since save) and one snapshot entry is registered.
 */
async function changeTerrainLayers<T>(
	mesh: Mesh,
	plugin: TerrainMaterialPlugin,
	busyLabel: string,
	undoLabel: string,
	change: (data: ITerrainMaterialData, weights: ITerrainWeightMaps | null) => ITerrainLayerChange<T> | null
): Promise<T | null> {
	const scope = createTerrainBusyScope(busyLabel, mesh);

	try {
		normalizeTerrainPluginAssetPaths(plugin);

		await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
		scope.throwIfAborted();

		const acquired = TerrainWeightsBinding.acquire(plugin);
		if (!acquired.weights && acquired.refusal !== "no-layer") {
			throw createTerrainRefusedError(acquired.refusal);
		}

		const next = change(cloneTerrainMaterialData(plugin.data as ITerrainMaterialData), acquired.weights?.maps ?? null);
		if (!next) {
			return null;
		}

		// §6.2: map 1 exists only above 4 layers; a new map 1 and a dropped one have no file (path null).
		const layerCount = next.data.layers.length;
		const hadMap1 = plugin.data.layers.length > TERRAIN_LAYERS_PER_WEIGHT_MAP;
		if (layerCount <= TERRAIN_LAYERS_PER_WEIGHT_MAP || !hadMap1) {
			next.data.weightMaps = [next.data.weightMaps[0], null];
		}

		const before = captureTerrainLayerState(plugin);
		installTerrainLayerState(plugin, { data: next.data, maps: [next.maps.maps[0], layerCount > TERRAIN_LAYERS_PER_WEIGHT_MAP ? next.maps.maps[1] : null] });

		const payload = createTerrainSnapshotPayload<ITerrainLayerState>({
			state: before,
			byteLength: (before.maps[0]?.byteLength ?? 0) + (before.maps[1]?.byteLength ?? 0) + JSON.stringify(before.data).length,
			signature: "",
			exchange: (state) => {
				const previous = captureTerrainLayerState(plugin);
				installTerrainLayerState(plugin, state);
				return { previous, changed: {} };
			},
		});

		const kinds: TerrainChangeKind[] = ["layers", "weights"];
		getTerrainUndoStore().register(mesh, payload, undoLabel, { snapshot: true, kinds });
		notifyTerrainChanged(mesh, kinds, "layers");

		return next.result;
	} finally {
		scope.dispose();
	}
}

/** Current data (copy) and weight arrays of the plugin (taken over by the payload: installTerrainLayerState replaces both maps). */
function captureTerrainLayerState(plugin: TerrainMaterialPlugin): ITerrainLayerState {
	return {
		data: cloneTerrainMaterialData(plugin.data as ITerrainMaterialData),
		maps: [plugin.getWeightMap(0)?.data ?? null, plugin.getWeightMap(1)?.data ?? null],
	};
}

/** Installs data and maps (ownership of the arrays handed over to the plugin); present maps are dirty since save. */
function installTerrainLayerState(plugin: TerrainMaterialPlugin, state: ITerrainLayerState): void {
	plugin.setData(cloneTerrainMaterialData(state.data));

	([0, 1] as const).forEach((index) => {
		const data = state.maps[index];
		plugin.setWeightMap(index, data ? { size: Math.round(Math.sqrt(data.length / 4)), data } : null);
		markTerrainWeightMapDirty(plugin, index, !!data);
	});
}

function getRequiredTerrainPlugin(mesh: Mesh): TerrainMaterialPlugin {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (!plugin) {
		throw createTerrainRefusedError("no-material");
	}

	return plugin;
}

/** Terrain data written by a newer editor is read-only (§6.11): editing it would drop its unknown fields. */
function assertTerrainLayersEditable(plugin: TerrainMaterialPlugin): void {
	if (isTerrainPluginDataNewer(plugin)) {
		throw createTerrainRefusedError("read-only");
	}
}

function createTerrainLayer(partial: Partial<ITerrainLayerData>, usedIds: Set<string>, defaultName: string): ITerrainLayerData {
	const values = sanitizeTerrainLayerPatch(partial);
	const id = typeof partial.id === "string" && TERRAIN_LAYER_ID_PATTERN.test(partial.id) && !usedIds.has(partial.id) ? partial.id : createUniqueTerrainLayerId(usedIds);

	usedIds.add(id);

	return createDefaultTerrainLayer({ ...values, name: values.name?.trim() ? values.name : defaultName, id });
}

function createUniqueTerrainLayerId(usedIds: Set<string>): string {
	let id = createTerrainLayerId();
	while (usedIds.has(id)) {
		id = createTerrainLayerId();
	}

	usedIds.add(id);
	return id;
}

/** Values of `keys` in the layer (deep copies), overridden by `previous` where given (sanitized). */
function pickTerrainLayerValues(layer: Readonly<ITerrainLayerData>, keys: (keyof TerrainLayerPatch)[], previous?: TerrainLayerPatch): TerrainLayerPatch {
	const override = previous ? sanitizeTerrainLayerPatch(previous) : {};
	const values: Record<string, unknown> = {};

	for (const key of keys) {
		const value = override[key] !== undefined ? override[key] : layer[key];
		values[key] = value === undefined ? value : JSON.parse(JSON.stringify(value));
	}

	return values as TerrainLayerPatch;
}

function removeTerrainAutoPaintRule(data: ITerrainMaterialData, layerId: string): void {
	const rules = data.editor?.autoPaintRules;
	if (Array.isArray(rules)) {
		data.editor.autoPaintRules = rules.filter((rule) => rule?.layerId !== layerId);
	}
}

/** Raw stored value of data.editor.autoPaintRules (deep copy; undefined when absent). */
function getStoredTerrainAutoPaintRules(plugin: TerrainMaterialPlugin): unknown {
	const value = (plugin.data.editor as Record<string, unknown> | undefined)?.autoPaintRules;
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/** Writes data.editor.autoPaintRules (removed when `rules` is undefined) through setData. */
function installTerrainAutoPaintRules(plugin: TerrainMaterialPlugin, rules: unknown): void {
	const data = cloneTerrainMaterialData(plugin.data as ITerrainMaterialData);
	const editor: Record<string, unknown> = data.editor && typeof data.editor === "object" ? data.editor : {};

	if (rules === undefined) {
		delete editor.autoPaintRules;
	} else {
		editor.autoPaintRules = JSON.parse(JSON.stringify(rules));
	}

	data.editor = editor;
	plugin.setData(data);
}

function clampIndex(index: number, max: number): number {
	const value = typeof index === "number" && Number.isFinite(index) ? Math.round(index) : max;
	return Math.min(max, Math.max(0, value));
}

function readNumbers(value: unknown, count: number): number[] | null {
	if (!Array.isArray(value) || value.length < count) {
		return null;
	}

	const numbers = value.slice(0, count);
	return numbers.every((item) => typeof item === "number" && Number.isFinite(item)) ? numbers : null;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
