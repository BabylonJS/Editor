import { createTerrainWeightMap, TERRAIN_LAYERS_PER_WEIGHT_MAP, TERRAIN_MAX_LAYERS, type ITerrainWeightMap, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { normalizeTerrainWeights, resampleTerrainWeightMaps } from "../core/weights";
import type { ITerrainRect, ITerrainTileResource, ITerrainWeightMaps, TerrainResourceKind } from "../core/types";

import { uploadTerrainWeightRect } from "./gpu";

/** Minimum interval between two mipmap generations of a weight map while a paint stroke changes it (§5.6.2). */
export const TERRAIN_WEIGHT_MIPMAP_INTERVAL_MS = 100;

/** Why the weight maps of a plugin can't be edited now (subset of TerrainStrokeRefusal, same meaning and §1.17 texts). */
export type TerrainWeightsRefusal = "no-material" | "no-layer" | "weights-loading" | "weights-error";

export type TerrainWeightsAcquireResult = { weights: TerrainWeightsBinding; refusal: null } | { weights: null; refusal: TerrainWeightsRefusal };

export interface ITerrainWeightsFlushOptions {
	/** Clock of the mipmap throttle (default performance.now()). */
	nowMs?: number;
	/** Default true: mipmaps of uploaded maps are generated at most every TERRAIN_WEIGHT_MIPMAP_INTERVAL_MS. false defers them to finalize. */
	generateMipmaps?: boolean;
}

export interface ITerrainWeightsFlushResult {
	/** Bytes of the packed rects sent through the plugin (GPU seam). */
	uploadedBytes: number;
	/** Number of generateWeightMapMipmaps calls. */
	mipmapsGenerated: number;
}

const dirtySinceSave = new WeakMap<TerrainMaterialPlugin, [boolean, boolean]>();
const bindings = new WeakMap<TerrainMaterialPlugin, TerrainWeightsBinding>();

/**
 * Weight maps binding of a terrain material plugin (§6.2): a live ITerrainWeightMaps view over the plugin's CPU arrays (texture order,
 * layer l in map l >> 2 channel l & 3), the texel rects waiting for their upload, the mipmap throttle and the "dirty since save" flags.
 *
 * Every editor read or write of weights goes through `TerrainWeightsBinding.acquire(plugin)`, which prepares the maps once per load:
 * channels >= layer count (stored as 255 on disk) are zeroed, missing maps are created when there is nothing to load (map 0 with layer 1
 * everywhere, map 1 with zeros), and maps whose size differs from data.weightMapSize are resampled (§4.10.7) and marked dirty.
 */
export class TerrainWeightsBinding {
	public readonly plugin: TerrainMaterialPlugin;

	private _maps: ITerrainWeightMaps;
	private _resources: [ITerrainTileResource, ITerrainTileResource | null];

	private readonly _dirty: [ITerrainRect | null, ITerrainRect | null] = [null, null];
	private readonly _changed: [boolean, boolean] = [false, false];
	private readonly _mipmapsStale: [boolean, boolean] = [false, false];
	private readonly _lastMipmapsMs: [number, number] = [-Infinity, -Infinity];

	private constructor(plugin: TerrainMaterialPlugin, maps: ITerrainWeightMaps) {
		this.plugin = plugin;
		this._maps = maps;
		this._resources = createResources(maps);
	}

	/**
	 * Binds the weight maps of the plugin for reading or painting (§6.2). Refused with "no-material" (no plugin), "no-layer" (no layer),
	 * "weights-loading" (a map with a path has no CPU data yet: await plugin.whenWeightMapsReadyAsync()) or "weights-error" (the load failed).
	 * The returned binding is the same object while the plugin keeps the same arrays and layer count.
	 * @param plugin defines the reference to the terrain material plugin (null or undefined refuses "no-material").
	 */
	public static acquire(plugin: TerrainMaterialPlugin | null | undefined): TerrainWeightsAcquireResult {
		if (!plugin) {
			return { weights: null, refusal: "no-material" };
		}

		const layerCount = Math.min(plugin.data.layers.length, TERRAIN_MAX_LAYERS);
		if (layerCount < 1) {
			return { weights: null, refusal: "no-layer" };
		}

		const existing = bindings.get(plugin);
		if (existing?.isValid) {
			return { weights: existing, refusal: null };
		}

		const result = prepareTerrainWeightMaps(plugin, layerCount);
		if (!result.maps) {
			return { weights: null, refusal: result.refusal };
		}

		if (existing) {
			existing._rebind(result.maps);
			return { weights: existing, refusal: null };
		}

		const binding = new TerrainWeightsBinding(plugin, result.maps);
		bindings.set(plugin, binding);

		return { weights: binding, refusal: null };
	}

	/**
	 * Returns the binding of the plugin when it exists and still matches the plugin's arrays (no side effect, never prepares maps).
	 * @param plugin defines the reference to the terrain material plugin.
	 */
	public static peek(plugin: TerrainMaterialPlugin | null | undefined): TerrainWeightsBinding | null {
		const binding = plugin ? bindings.get(plugin) : undefined;
		return binding?.isValid ? binding : null;
	}

	/** Live logical weights (arrays owned by the plugin): maps[1] is null when the material has 4 layers or less. */
	public get maps(): ITerrainWeightMaps {
		return this._maps;
	}

	/** Size (texels) of the square maps. */
	public get size(): number {
		return this._maps.size;
	}

	/** Number of layers of the material when the binding was (re)built. */
	public get layerCount(): number {
		return this._maps.layerCount;
	}

	/** 1 or 2 weight maps. */
	public get mapCount(): 1 | 2 {
		return this._maps.maps[1] ? 2 : 1;
	}

	/** CPU bytes of the bound maps. */
	public get cpuBytes(): number {
		return this._maps.maps[0].byteLength + (this._maps.maps[1]?.byteLength ?? 0);
	}

	/** False when the plugin replaced its arrays, changed its layer count or weight map size since the binding was built. */
	public get isValid(): boolean {
		const data = this.plugin.data;
		const layerCount = Math.min(data.layers.length, TERRAIN_MAX_LAYERS);
		if (layerCount !== this._maps.layerCount || data.weightMapSize !== this._maps.size) {
			return false;
		}

		const map0 = this.plugin.getWeightMap(0);
		if (!map0 || map0.data !== this._maps.maps[0] || map0.size !== this._maps.size) {
			return false;
		}

		if (layerCount > TERRAIN_LAYERS_PER_WEIGHT_MAP) {
			const map1 = this.plugin.getWeightMap(1);
			return !!map1 && map1.data === this._maps.maps[1] && map1.size === this._maps.size;
		}

		return this._maps.maps[1] === null;
	}

	/** True while texel rects wait for their upload. */
	public get hasPendingUploads(): boolean {
		return this._dirty[0] !== null || this._dirty[1] !== null;
	}

	/** True when a map changed since the last finalize. */
	public get needsFinalize(): boolean {
		return this._changed[0] || this._changed[1];
	}

	/**
	 * Live resource of the undo journal (§7.1): weights0 / weights1 (texels, N², 4 bytes); null for other kinds or a missing map 1.
	 * @param kind defines the resource kind.
	 */
	public getResource(kind: TerrainResourceKind): ITerrainTileResource | null {
		switch (kind) {
			case "weights0":
				return this._resources[0];
			case "weights1":
				return this._resources[1];
			default:
				return null;
		}
	}

	/**
	 * Records a changed texel rect of a map (texture order, clamped to the map); other kinds are ignored.
	 * @param kind defines the resource kind (weights0 or weights1).
	 * @param rect defines the inclusive texel rect.
	 */
	public markDirty(kind: TerrainResourceKind, rect: ITerrainRect): void {
		const index = getWeightMapIndex(kind);
		if (index === null || (index === 1 && !this._maps.maps[1])) {
			return;
		}

		const size = this._maps.size;
		const x0 = Math.max(0, Math.floor(rect.x0));
		const y0 = Math.max(0, Math.floor(rect.y0));
		const x1 = Math.min(size - 1, Math.ceil(rect.x1));
		const y1 = Math.min(size - 1, Math.ceil(rect.y1));
		if (x1 < x0 || y1 < y0) {
			return;
		}

		const current = this._dirty[index];
		this._dirty[index] = current
			? { x0: Math.min(current.x0, x0), y0: Math.min(current.y0, y0), x1: Math.max(current.x1, x1), y1: Math.max(current.y1, y1) }
			: { x0, y0, x1, y1 };
		this._changed[index] = true;
	}

	/**
	 * Marks every texel of the bound maps dirty (whole-map operations: fill, auto-paint all, normalize, masks, undo of full payloads).
	 */
	public markAllDirty(): void {
		const last = this._maps.size - 1;
		this.markDirty("weights0", { x0: 0, y0: 0, x1: last, y1: last });
		if (this._maps.maps[1]) {
			this.markDirty("weights1", { x0: 0, y0: 0, x1: last, y1: last });
		}
	}

	/**
	 * Frame flush (§2.4 step 3): uploads the dirty rect of each map through plugin.updateWeightMapRegion (packed rect, level 0) and
	 * generates the mipmaps of an uploaded map at most every TERRAIN_WEIGHT_MIPMAP_INTERVAL_MS (the others wait for the next flush or finalize).
	 * @param options defines the clock and whether mipmaps may be generated.
	 */
	public flush(options: ITerrainWeightsFlushOptions = {}): ITerrainWeightsFlushResult {
		const result: ITerrainWeightsFlushResult = { uploadedBytes: 0, mipmapsGenerated: 0 };

		if (!this.isValid) {
			this._resetPending();
			return result;
		}

		const now = options.nowMs ?? performance.now();
		const generateMipmaps = options.generateMipmaps ?? true;

		for (const index of [0, 1] as const) {
			const rect = this._dirty[index];
			if (rect) {
				this._dirty[index] = null;
				result.uploadedBytes += uploadTerrainWeightRect(this.plugin, index, rect);
				this._mipmapsStale[index] = true;
			}

			if (generateMipmaps && this._mipmapsStale[index] && now - this._lastMipmapsMs[index] >= TERRAIN_WEIGHT_MIPMAP_INTERVAL_MS) {
				this._generateMipmaps(index, now);
				++result.mipmapsGenerated;
			}
		}

		return result;
	}

	/**
	 * Finalization (stroke end, undo/redo, operations; §6.1): uploads the pending rects, generates the mipmaps of every changed map and sets
	 * their "dirty since save" flags. Without indices, finalizes the maps changed since the last finalize. Returns the finalized indices.
	 * @param indices defines the maps to finalize.
	 */
	public finalize(indices?: readonly (0 | 1)[]): (0 | 1)[] {
		const targets = indices ?? ([0, 1] as const).filter((index) => this._changed[index]);

		if (!this.isValid) {
			this._resetPending();
			return [];
		}

		// A map named explicitly but never marked (edited in place by an operation) is uploaded whole.
		for (const index of targets) {
			const last = this._maps.size - 1;
			if (!this._changed[index] && (index === 0 || this._maps.maps[1])) {
				this.markDirty(index === 0 ? "weights0" : "weights1", { x0: 0, y0: 0, x1: last, y1: last });
			}
		}

		this.flush({ generateMipmaps: false });

		const now = performance.now();
		const finalized: (0 | 1)[] = [];

		for (const index of targets) {
			if (index === 1 && !this._maps.maps[1]) {
				continue;
			}

			this._generateMipmaps(index, now);
			this._changed[index] = false;

			markTerrainWeightMapDirty(this.plugin, index);
			finalized.push(index);
		}

		return finalized;
	}

	private _generateMipmaps(index: 0 | 1, now: number): void {
		this.plugin.generateWeightMapMipmaps(index);
		this._lastMipmapsMs[index] = now;
		this._mipmapsStale[index] = false;
	}

	private _rebind(maps: ITerrainWeightMaps): void {
		this._maps = maps;
		this._resources = createResources(maps);
		this._resetPending();
	}

	private _resetPending(): void {
		this._dirty[0] = this._dirty[1] = null;
		this._mipmapsStale[0] = this._mipmapsStale[1] = false;
	}
}

/**
 * Returns a copy of the "dirty since save" flags of the plugin's weight maps (§6.2): set by strokes, undo/redo, layer operations, masks,
 * resample, fill and auto-paint; cleared by markTerrainWeightMapSaved after a successful write.
 * @param plugin defines the reference to the terrain material plugin.
 */
export function getTerrainWeightMapDirtyFlags(plugin: TerrainMaterialPlugin): [boolean, boolean] {
	const flags = dirtySinceSave.get(plugin);
	return flags ? [flags[0], flags[1]] : [false, false];
}

/**
 * Returns whether the weight map `index` of the plugin changed since it was last saved.
 * @param plugin defines the reference to the terrain material plugin.
 * @param index defines the weight map index.
 */
export function isTerrainWeightMapDirty(plugin: TerrainMaterialPlugin, index: 0 | 1): boolean {
	return dirtySinceSave.get(plugin)?.[index] ?? false;
}

/**
 * Sets the "dirty since save" flag of a weight map (true by default). Layer operations, masks, fills... that replace or edit maps outside
 * a binding's finalize call it.
 * @param plugin defines the reference to the terrain material plugin.
 * @param index defines the weight map index.
 * @param dirty defines the value of the flag.
 */
export function markTerrainWeightMapDirty(plugin: TerrainMaterialPlugin, index: 0 | 1, dirty: boolean = true): void {
	let flags = dirtySinceSave.get(plugin);
	if (!flags) {
		flags = [false, false];
		dirtySinceSave.set(plugin, flags);
	}

	flags[index] = dirty;
}

/**
 * Clears the "dirty since save" flag of a weight map after a successful write (markTerrainWeightMapSaved).
 * @param plugin defines the reference to the terrain material plugin.
 * @param index defines the weight map index.
 */
export function markTerrainWeightMapSaved(plugin: TerrainMaterialPlugin, index: 0 | 1): void {
	markTerrainWeightMapDirty(plugin, index, false);
}

/**
 * Installs weight map paths and CPU data captured earlier (undo/redo of relink and "Reset weights", §6.2, §7.1). Paths first; when a map has
 * a path but no data (its load failed, or never ran), the maps are reloaded from their paths, so that load runs again and its outcome comes
 * back (the "error" state and its banner, or the data): setting such a map to null instead would leave the plugin "ready" with a map to load
 * that nothing ever loads (strokes refused "weights-loading" forever). The maps with data are installed after the reload started:
 * setWeightMap takes them out of the load in flight, so the given bytes win. Maps with neither data nor path are removed.
 * @param plugin defines the reference to the terrain material plugin.
 * @param paths defines the weight map paths.
 * @param maps defines the CPU data of each map (ownership transferred to the plugin), null for none.
 */
export function installTerrainWeightMaps(
	plugin: TerrainMaterialPlugin,
	paths: readonly [string | null, string | null],
	maps: readonly [Uint8Array | null, Uint8Array | null]
): void {
	plugin.setWeightMapPaths([paths[0], paths[1]]);

	let reloading = false;
	if (([0, 1] as const).some((index) => paths[index] !== null && !maps[index])) {
		plugin.reloadWeightMaps();
		// No load starts without a root URL (no project): the maps without data are then removed like the others.
		reloading = plugin.weightMapsState === "loading";
	}

	([0, 1] as const).forEach((index) => {
		const data = maps[index];
		if (data) {
			plugin.setWeightMap(index, { size: Math.round(Math.sqrt(data.length / 4)), data });
		} else if (!reloading || paths[index] === null) {
			plugin.setWeightMap(index, null);
		}
	});
}

function prepareTerrainWeightMaps(plugin: TerrainMaterialPlugin, layerCount: number): { maps: ITerrainWeightMaps; refusal: null } | { maps: null; refusal: TerrainWeightsRefusal } {
	const data = plugin.data;
	const state = plugin.weightMapsState;
	if (state === "error") {
		return { maps: null, refusal: "weights-error" };
	}

	const loading = state === "idle" || state === "loading";
	const needsMap1 = layerCount > TERRAIN_LAYERS_PER_WEIGHT_MAP;

	let map0 = plugin.getWeightMap(0);
	let map1 = needsMap1 ? plugin.getWeightMap(1) : null;

	if ((!map0 && data.weightMaps[0] !== null) || (needsMap1 && !map1 && data.weightMaps[1] !== null)) {
		return { maps: null, refusal: loading ? "weights-loading" : "weights-error" };
	}

	if (!map0) {
		// Nothing to load (no file written yet): layer 1 everywhere, dirty.
		map0 = createTerrainWeightMap(data.weightMapSize, 0);
		plugin.setWeightMap(0, map0);
		markTerrainWeightMapDirty(plugin, 0);
	}

	if (needsMap1 && !map1) {
		// Layers 5..8 without a file: zero weights, dirty.
		map1 = { size: map0.size, data: new Uint8Array(map0.size * map0.size * 4) };
		plugin.setWeightMap(1, map1);
		markTerrainWeightMapDirty(plugin, 1);
	}

	// Channels >= layer count are stored as 255 on disk (§6.2): zero them in the CPU copy before any read or paint.
	zeroUnusedTerrainChannels(map0.data, layerCount, 0);
	if (map1) {
		zeroUnusedTerrainChannels(map1.data, layerCount, 1);
	}

	let map1Data = map1?.data ?? null;
	let mismatch = false;

	if (map1 && map1.size !== map0.size) {
		// Map 1 edited outside the editor with another size: nearest copy at the size of map 0, re-quantized below.
		map1Data = resizeTerrainWeightMapNearest(map1, map0.size);
		mismatch = true;
	}

	let maps: ITerrainWeightMaps = { size: map0.size, layerCount, maps: [map0.data, map1Data] };
	let rewrite = mismatch;

	if (map0.size !== data.weightMapSize) {
		// §4.10.7: bilinear per layer at the destination texel centres, then quantized (Σ = 255).
		maps = resampleTerrainWeightMaps(maps, data.weightMapSize);
		rewrite = true;
	} else if (mismatch) {
		normalizeTerrainWeights(maps);
	}

	if (rewrite) {
		// setWeightMap takes the arrays and recreates the textures (map 0 may have been re-quantized in place).
		plugin.setWeightMap(0, { size: maps.size, data: maps.maps[0] });
		markTerrainWeightMapDirty(plugin, 0);

		const rewritten1 = maps.maps[1];
		if (map1 && rewritten1) {
			plugin.setWeightMap(1, { size: maps.size, data: rewritten1 });
			markTerrainWeightMapDirty(plugin, 1);
		}
	}

	return { maps: { size: maps.size, layerCount, maps: [maps.maps[0], needsMap1 ? maps.maps[1] : null] }, refusal: null };
}

/**
 * Zeroes the channels of map `index` whose layer (4 index + channel) is >= layerCount.
 * @param data defines the RGBA8 data of the map.
 * @param layerCount defines the number of layers of the material.
 * @param index defines the weight map index.
 */
function zeroUnusedTerrainChannels(data: Uint8Array, layerCount: number, index: 0 | 1): void {
	const used = Math.max(0, Math.min(TERRAIN_LAYERS_PER_WEIGHT_MAP, layerCount - index * TERRAIN_LAYERS_PER_WEIGHT_MAP));
	if (used >= TERRAIN_LAYERS_PER_WEIGHT_MAP) {
		return;
	}

	for (let i = 0; i < data.length; i += 4) {
		for (let channel = used; channel < TERRAIN_LAYERS_PER_WEIGHT_MAP; ++channel) {
			data[i + channel] = 0;
		}
	}
}

function resizeTerrainWeightMapNearest(map: ITerrainWeightMap, size: number): Uint8Array {
	const result = new Uint8Array(size * size * 4);

	for (let y = 0; y < size; ++y) {
		const sy = Math.min(map.size - 1, Math.floor(((y + 0.5) * map.size) / size));
		for (let x = 0; x < size; ++x) {
			const sx = Math.min(map.size - 1, Math.floor(((x + 0.5) * map.size) / size));
			const source = (sy * map.size + sx) * 4;
			const target = (y * size + x) * 4;

			result[target] = map.data[source];
			result[target + 1] = map.data[source + 1];
			result[target + 2] = map.data[source + 2];
			result[target + 3] = map.data[source + 3];
		}
	}

	return result;
}

function createResources(maps: ITerrainWeightMaps): [ITerrainTileResource, ITerrainTileResource | null] {
	const map1 = maps.maps[1];

	return [
		{ kind: "weights0", width: maps.size, height: maps.size, channels: 4, data: maps.maps[0] },
		map1 ? { kind: "weights1", width: maps.size, height: maps.size, channels: 4, data: map1 } : null,
	];
}

function getWeightMapIndex(kind: TerrainResourceKind): 0 | 1 | null {
	if (kind === "weights0") {
		return 0;
	}

	return kind === "weights1" ? 1 : null;
}
