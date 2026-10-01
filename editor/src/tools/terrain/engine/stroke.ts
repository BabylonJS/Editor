import { Ray, Vector3, type Mesh } from "babylonjs";
import type { TerrainLoadState, TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { sampleTerrainHeight } from "../core/heightfield";
import { isTerrainRectEmpty, unionTerrainRects } from "../core/rect";
import { TerrainStrokeEngine } from "../core/stroke-engine";
import type {
	ITerrainLocalRay,
	ITerrainRayHit,
	ITerrainStrokeConfig,
	ITerrainStrokeRequest,
	ITerrainStrokeSample,
	ITerrainStrokeTarget,
	ITerrainUndoPayload,
	TerrainRectsByKind,
	TerrainResourceKind,
	TerrainTileResourceProvider,
	TerrainTool,
} from "../core/types";

import {
	TERRAIN_REFUSAL_MESSAGES,
	type ITerrainPointerSample,
	type ITerrainStrokeHandle,
	type ITerrainStrokePreview,
	type TerrainChangeKind,
	type TerrainEligibility,
	type TerrainStrokeRefusal,
} from "./types";
import { TerrainWorkSlicer, type ITerrainBusyScope } from "./yield";

// §1.17 `refused.*` texts: defined next to TerrainStrokeRefusal (engine/types.ts), where the UI reads them too.
export { TERRAIN_REFUSAL_MESSAGES };

/** Paint tools (§1.10): they write the weight maps. */
const PAINT_TOOLS: ReadonlySet<TerrainTool> = new Set<TerrainTool>(["paint", "blend", "replace"]);

/** Duration between two synthetic samples of a headless stroke (§3.5 applyStroke). */
export const TERRAIN_HEADLESS_SAMPLE_INTERVAL_MS = 16;

/**
 * Returns the §1.17 text of a refusal.
 * @param refusal defines the refusal.
 */
export function getTerrainRefusalMessage(refusal: TerrainStrokeRefusal): string {
	return TERRAIN_REFUSAL_MESSAGES[refusal];
}

/**
 * Returns whether or not the tool writes the weight maps (paint, blend, replace).
 * @param tool defines the tool to test.
 */
export function isTerrainPaintTool(tool: TerrainTool | null | undefined): boolean {
	return !!tool && PAINT_TOOLS.has(tool);
}

/** State of the terrain material seen by the refusal rules. */
export interface ITerrainRefusalPluginState {
	/** Ids of the layers, in order. */
	layerIds: readonly string[];
	weightMapsState: TerrainLoadState;
	/** true when the CPU data of weight map 0 exists (loaded or created). */
	hasWeightData: boolean;
}

/** Everything the refusal rules of strokes and mutations need (§1.17, §7.3). Gathered by getTerrainEditRefusal; the rules are pure. */
export interface ITerrainRefusalInput {
	eligibility: TerrainEligibility;
	playing: boolean;
	saving: boolean;
	/** A stroke is active or a busy scope is open. */
	busy: boolean;
	/** !mesh.isEnabled() || !mesh.isVisible. */
	hidden: boolean;
	sharedGeometry: boolean;
	sharedMaterial: boolean;
	/** The mutation writes the weight maps (paint tools, weight operations, masks). */
	paint: boolean;
	/** The mutation needs `layerId` to be a layer of the terrain material (paint and replace tools). */
	requiresLayer: boolean;
	layerId: string | null;
	/** A layer filter is enabled: it needs loaded weights when the terrain has a terrain material (§4.13). */
	layerFilter: boolean;
	/** null when the mesh has no terrain material. */
	plugin: ITerrainRefusalPluginState | null;
	/** Skip the weight loading check (headless strokes wait for the weights instead); a failed load still refuses. */
	ignoreWeightsLoading?: boolean;
	/** Skip every weight state check (weights-error and weights-loading): operations wait for the loads and check them themselves. */
	ignoreWeightsState?: boolean;
}

/**
 * Pure refusal rules of strokes and terrain mutations (§1.17, §7.3), first match in this order: playing, not-eligible,
 * unsupported-resolution, read-only, saving, busy, hidden, shared-geometry, then for paint mutations
 * no-material, shared-material, no-layer, weights-error, weights-loading, and for layer filters weights-error, weights-loading.
 * @param input defines the state gathered by getTerrainEditRefusal.
 */
export function getTerrainRefusal(input: ITerrainRefusalInput): TerrainStrokeRefusal | null {
	if (input.playing) {
		return "playing";
	}

	const eligibility = input.eligibility;
	if (!eligibility.eligible) {
		return "not-eligible";
	}

	if (eligibility.warnings.includes("unsupported-resolution")) {
		return "unsupported-resolution";
	}

	if (eligibility.readOnly || eligibility.warnings.includes("newer-version")) {
		return "read-only";
	}

	if (input.saving) {
		return "saving";
	}

	if (input.busy) {
		return "busy";
	}

	if (input.hidden) {
		return "hidden";
	}

	if (input.sharedGeometry) {
		return "shared-geometry";
	}

	const plugin = input.plugin;

	if (input.paint) {
		if (!plugin) {
			return "no-material";
		}

		if (input.sharedMaterial) {
			return "shared-material";
		}

		if (!plugin.layerIds.length || (input.requiresLayer && (!input.layerId || !plugin.layerIds.includes(input.layerId)))) {
			return "no-layer";
		}

		return input.ignoreWeightsState ? null : getTerrainWeightsRefusal(plugin, input.ignoreWeightsLoading ?? false);
	}

	if (input.layerFilter && plugin && !input.ignoreWeightsState) {
		return getTerrainWeightsRefusal(plugin, input.ignoreWeightsLoading ?? false);
	}

	return null;
}

function getTerrainWeightsRefusal(plugin: ITerrainRefusalPluginState, ignoreLoading: boolean): TerrainStrokeRefusal | null {
	if (plugin.weightMapsState === "error") {
		return "weights-error";
	}

	if (!plugin.hasWeightData && !ignoreLoading) {
		return "weights-loading";
	}

	return null;
}

/**
 * Live data of one terrain as seen by strokes, operations and undo (built by getTerrainEditTarget over the geometry and weights bindings).
 * Everything is in the terrain's local space except where stated.
 */
export interface ITerrainEditTarget {
	readonly mesh: Mesh;
	/** Core view of the live data: grid, metric, heights, holes, weights (null without loaded weights), surface sampler, markDirty. */
	readonly target: ITerrainStrokeTarget;
	/** Tiles provider over the live arrays (heights, holes, weights0, weights1), for journals and payloads. */
	readonly provider: TerrainTileResourceProvider;
	/** `${grid.signature}|${weightMapSize ?? 0}` (§7.1). */
	readonly signature: string;
	/** World ray → local ray (inverse world matrix; direction not normalized so t stays the world ray parameter). */
	toLocalRay(ray: Ray): ITerrainLocalRay;
	/** Heightfield ray-march over the live heights (§4.8); hole quads are transparent unless solidHoles. */
	raycast(ray: ITerrainLocalRay, solidHoles: boolean): ITerrainRayHit | null;
	/** World position of a local point. */
	localToWorld(x: number, y: number, z: number): Vector3;
	/**
	 * Uploads the rects marked dirty (heights → positions, normals, row-band vertex uploads, throttled index rebuild, weight rects,
	 * weight mips at most every 100 ms while painting). final = no per-frame budget and every pending upload done. Returns the uploaded bytes.
	 */
	flush(final: boolean): number;
	/** Finalizes the changed kinds (§6.1): exact bounds, instances, GroundMesh height quads, dependents, final index rebuild, weight mips, dirty-since-save flags. */
	finalize(changed: TerrainRectsByKind): void;
}

/**
 * Builds the stroke engine configuration (§3.3 ITerrainStrokeConfig): layer indices resolved against the terrain material.
 * @param request defines the stroke request.
 * @param plugin defines the terrain material plugin (null for terrains without terrain material).
 * @param provider defines the tiles provider of the journal.
 * @param hasWeights defines whether or not the stroke target exposes loaded weights (layer filters need them).
 */
export function createTerrainStrokeConfig(
	request: ITerrainStrokeRequest,
	plugin: TerrainMaterialPlugin | null,
	provider: TerrainTileResourceProvider,
	hasWeights: boolean
): ITerrainStrokeConfig {
	const layers = plugin?.data.layers ?? [];
	const indexOf = (id: string | null | undefined) => (id ? layers.findIndex((layer) => layer.id === id) : -1);
	const paint = isTerrainPaintTool(request.tool);

	return {
		request,
		layerIndex: paint ? indexOf(request.layerId) : -1,
		replaceFromLayerIndex: request.tool === "replace" ? indexOf(request.paint.replaceFromLayerId) : -1,
		filterLayerIndex: request.filters.layer.enabled && hasWeights ? indexOf(request.filters.layer.layerId) : -1,
		provider,
	};
}

/**
 * Change kinds of dirty rects (heights → "heights", holes → "holes", weights0/1 → "weights").
 * @param rects defines the rects by resource kind.
 */
export function getTerrainChangeKinds(rects: TerrainRectsByKind): TerrainChangeKind[] {
	const kinds: TerrainChangeKind[] = [];

	if (!isTerrainRectEmpty(rects.heights)) {
		kinds.push("heights");
	}

	if (!isTerrainRectEmpty(rects.holes)) {
		kinds.push("holes");
	}

	if (!isTerrainRectEmpty(rects.weights0) || !isTerrainRectEmpty(rects.weights1)) {
		kinds.push("weights");
	}

	return kinds;
}

/**
 * Marks every rect of `rects` dirty on the stroke target (after a journal revert or a payload swap, which write the live arrays directly).
 * @param target defines the stroke target.
 * @param rects defines the rects to mark.
 */
export function markTerrainRectsDirty(target: ITerrainStrokeTarget, rects: TerrainRectsByKind): void {
	for (const kind of Object.keys(rects) as TerrainResourceKind[]) {
		const rect = rects[kind];
		if (rect && !isTerrainRectEmpty(rect)) {
			target.markDirty(kind, rect);
		}
	}
}

/** How a stroke ended, handed to the owner of the handle (editing.ts registers the undo entry and notifies). */
export interface ITerrainStrokeEnd {
	/** true for end(), false for cancel(). */
	committed: boolean;
	/** Payload of the committed stroke; null when nothing changed or when cancelled. */
	payload: ITerrainUndoPayload | null;
	/** Rects changed by the stroke (committed) or restored (cancelled). */
	changed: TerrainRectsByKind;
	/** Dabs applied through process(). */
	dabs: number;
	/** Error raised while finishing the stroke, if any (the handle is inactive anyway). */
	error: unknown;
}

export interface ITerrainStrokeHandleOptions {
	/** Headless strokes (MCP) are fed with world XZ points and processed in slices; they never become the active stroke of the viewport. */
	headless?: boolean;
	/** Called once when the stroke ends (end or cancel). */
	onEnded: (handle: TerrainStrokeHandle, end: ITerrainStrokeEnd) => void;
}

/**
 * One stroke (§2.4, §4.3.1): pointer samples → metric-local samples → TerrainStrokeEngine; the owner calls process() every frame (UI) or
 * in slices (headless), end() commits one undo entry through the onEnded callback, cancel() restores the before-state.
 */
export class TerrainStrokeHandle implements ITerrainStrokeHandle {
	public readonly mesh: Mesh;
	public readonly tool: TerrainTool;
	public readonly request: ITerrainStrokeRequest;
	public readonly headless: boolean;
	public readonly engine: TerrainStrokeEngine;

	private readonly _edit: ITerrainEditTarget;
	private readonly _onEnded: (handle: TerrainStrokeHandle, end: ITerrainStrokeEnd) => void;

	private _active: boolean = true;
	private _dabs: number = 0;
	private _pending: number = 0;
	private _lastHitY: number | null = null;
	private _lastSampleTimeMs: number = 0;
	private _preview: ITerrainStrokePreview = { rampStart: null, rampEnd: null, targetHeightWorld: null, lazyCenter: null };

	/**
	 * @param edit defines the live data of the terrain.
	 * @param config defines the stroke configuration (request, layer indices, rules, provider).
	 * @param options defines the headless flag and the end callback.
	 */
	public constructor(edit: ITerrainEditTarget, config: ITerrainStrokeConfig, options: ITerrainStrokeHandleOptions) {
		this.mesh = edit.mesh;
		this.request = config.request;
		this.tool = config.request.tool;
		this.headless = options.headless ?? false;

		this._edit = edit;
		this._onEnded = options.onEnded;

		this.engine = new TerrainStrokeEngine(edit.target, config);
	}

	public get isActive(): boolean {
		return this._active;
	}

	/** Live data of the stroked terrain. */
	public get edit(): ITerrainEditTarget {
		return this._edit;
	}

	/** Dabs applied so far by process(). */
	public get dabs(): number {
		return this._dabs;
	}

	/** Dabs queued after the last process(). */
	public get pending(): number {
		return this._pending;
	}

	/** Time of the last sample (sample time base). */
	public get lastSampleTimeMs(): number {
		return this._lastSampleTimeMs;
	}

	/** World version of the engine preview (ramp ends, target height disc, lazy-mouse centre); the last one after the stroke ended. */
	public get preview(): Readonly<ITerrainStrokePreview> {
		if (!this._active) {
			return this._preview;
		}

		try {
			this._preview = this._computePreview();
		} catch (e) {
			reportStrokeError(e);
		}

		return this._preview;
	}

	/**
	 * Adds a pointer sample (UI strokes): ray-march on the live heights (holes transparent except for the Holes tool); a miss is intersected
	 * with the horizontal local plane of the last hit and kept while the dab still overlaps the terrain (§4.3.1), else the path breaks.
	 * @param sample defines the pointer sample.
	 */
	public addSample(sample: ITerrainPointerSample): void {
		if (!this._active) {
			return;
		}

		const local = this._edit.toLocalRay(sample.ray);
		const hit = this._edit.raycast(local, this.tool === "holes");

		let x: number;
		let z: number;

		if (hit) {
			x = hit.x;
			z = hit.z;
			this._lastHitY = hit.y;
		} else {
			const point = this._intersectMissPlane(local);
			if (!point) {
				this.engine.breakPath();
				return;
			}

			x = point.x;
			z = point.z;
		}

		this._addLocalSample(x, z, sample.timeMs, sample.invert);
	}

	/**
	 * Adds a world XZ point (headless strokes): vertical projection on the terrain's local XZ plane (exact for terrains that are not tilted).
	 * Points whose dab would not overlap the terrain break the path. Returns true when the point was added.
	 * @param worldX defines the world X coordinate (cm).
	 * @param worldZ defines the world Z coordinate (cm).
	 * @param timeMs defines the synthetic time of the sample.
	 */
	public addWorldPoint(worldX: number, worldZ: number, timeMs: number): boolean {
		if (!this._active) {
			return false;
		}

		const point = projectTerrainWorldPoint(this._edit, worldX, worldZ, this._lastHitY ?? 0);
		if (point) {
			this._lastHitY = point.y;
		}

		if (!point || !this._isWithinDabReach(point.x, point.z)) {
			this.engine.breakPath();
			return false;
		}

		this._addLocalSample(point.x, point.z, timeMs, this.request.invert);
		return true;
	}

	/** Breaks the path: no dab bridges the gap to the next sample. */
	public breakPath(): void {
		if (this._active) {
			this.engine.breakPath();
		}
	}

	/**
	 * Applies queued dabs until the budget is spent (frame observer or headless slices).
	 * @param budgetMs defines the time budget.
	 * @param nowMs defines the current time in the sample time base (airbrush).
	 * @param clock defines the clock used to measure the budget (default performance.now).
	 */
	public process(budgetMs: number, nowMs: number, clock?: () => number): { dabs: number; pending: number } {
		if (!this._active) {
			return { dabs: 0, pending: 0 };
		}

		const result = this.engine.process(budgetMs, nowMs, clock);
		this._dabs += result.dabs;
		this._pending = result.pending;

		return result;
	}

	/** Uploads the rects written so far (per-frame budget). Returns the uploaded bytes. */
	public flush(): number {
		return this._active ? this._edit.flush(false) : 0;
	}

	/** Commits: drains the remaining dabs, flushes everything, finalizes, then hands the journal payload to the owner (one undo entry). */
	public end(): void {
		if (!this._active) {
			return;
		}

		this._active = false;

		let changed: TerrainRectsByKind = {};
		let payload: ITerrainUndoPayload | null = null;
		let error: unknown = null;

		try {
			const finished = this.engine.finish();
			changed = unionTerrainRects(this.engine.dirty, finished);

			this._edit.flush(true);
			this._edit.finalize(changed);
		} catch (e) {
			error = e;
		}

		try {
			payload = this.engine.journal.commit();
		} catch (e) {
			error ??= e;
		}

		this._onEnded(this, { committed: true, payload, changed, dabs: this._dabs, error });
	}

	/** Restores the before-state (journal revert), flushes and finalizes; no undo entry. */
	public cancel(): void {
		if (!this._active) {
			return;
		}

		this._active = false;

		let restored: TerrainRectsByKind = {};
		let error: unknown = null;

		try {
			restored = this.engine.cancel();
			markTerrainRectsDirty(this._edit.target, restored);

			this._edit.flush(true);
			this._edit.finalize(restored);
		} catch (e) {
			error = e;
		}

		this._onEnded(this, { committed: false, payload: null, changed: restored, dabs: this._dabs, error });
	}

	/** Ends the stroke without touching the data or the GPU (scene or mesh disposed): no undo entry. */
	public abandon(): void {
		if (!this._active) {
			return;
		}

		this._active = false;
		this._onEnded(this, { committed: false, payload: null, changed: {}, dabs: this._dabs, error: null });
	}

	private _addLocalSample(x: number, z: number, timeMs: number, invert: boolean): void {
		const metric = this._edit.target.metric;
		const sample: ITerrainStrokeSample = {
			mx: x * metric.sx,
			mz: z * metric.sz,
			timeMs,
			invert,
		};

		this._lastSampleTimeMs = timeMs;
		this.engine.addSample(sample);
	}

	private _intersectMissPlane(local: ITerrainLocalRay): { x: number; z: number } | null {
		if (this._lastHitY === null) {
			return null;
		}

		const point = intersectLocalPlane(local, this._lastHitY, false);
		if (!point || !this._isWithinDabReach(point.x, point.z)) {
			return null;
		}

		return point;
	}

	/** |x| ≤ W/2 + R/sx and |z| ≤ H/2 + R/sz: a dab centred there still overlaps the terrain (§4.3.1). */
	private _isWithinDabReach(x: number, z: number): boolean {
		const { grid, metric } = this._edit.target;
		const radius = Math.max(0, this.request.brush.radius);

		return Math.abs(x) <= grid.width * 0.5 + radius / metric.sx && Math.abs(z) <= grid.height * 0.5 + radius / metric.sz;
	}

	private _computePreview(): ITerrainStrokePreview {
		const preview = this.engine.preview;
		const target = this._edit.target;
		const { grid, metric } = target;

		let lazyCenter: Vector3 | null = null;
		if (preview.lazyCenter) {
			const x = preview.lazyCenter.mx / metric.sx;
			const z = preview.lazyCenter.mz / metric.sz;
			const y = sampleTerrainHeight(target.heights, grid, clamp(x, grid.width), clamp(z, grid.height));
			lazyCenter = this._edit.localToWorld(x, y, z);
		}

		return {
			rampStart: preview.rampStart ? this._edit.localToWorld(preview.rampStart.x, preview.rampStart.y, preview.rampStart.z) : null,
			rampEnd: preview.rampEnd ? this._edit.localToWorld(preview.rampEnd.x, preview.rampEnd.y, preview.rampEnd.z) : null,
			targetHeightWorld: preview.targetLocalHeight !== null ? target.localToWorldHeight(preview.targetLocalHeight) : null,
			lazyCenter,
		};
	}
}

export interface ITerrainHeadlessStrokeOptions {
	/** Busy scope of the stroke: checked between slices (abort on scene dispose). */
	scope?: ITerrainBusyScope | null;
	/** Slice budget (default 16 ms). */
	sliceBudgetMs?: number;
	/** Clock of the slices (default performance.now). */
	clock?: () => number;
	/** Called after each slice with the fraction of the points fed so far (0..1). */
	onProgress?: (progress: number) => void;
}

/**
 * Runs a headless stroke (§3.5 applyStroke, §7.4): world XZ points fed with synthetic 16 ms timestamps, dabs applied in slices of ≤ 16 ms
 * separated by yieldTerrainWork() (no render loop needed), synchronous flushes after each slice, then end() (one undo entry).
 * When the scope is aborted, the stroke is cancelled (start state restored, no entry) and a TerrainOperationAbortedError is thrown.
 * @param handle defines the headless stroke.
 * @param worldPoints defines the world [x, z] points (cm).
 * @param options defines the busy scope, slice budget, clock and progress callback.
 */
export async function runTerrainHeadlessStroke(
	handle: TerrainStrokeHandle,
	worldPoints: readonly (readonly [number, number])[],
	options: ITerrainHeadlessStrokeOptions = {}
): Promise<void> {
	const clock = options.clock ?? getNow;
	const slicer = new TerrainWorkSlicer(options.sliceBudgetMs, clock);

	const checkAbort = () => {
		if (options.scope?.aborted) {
			handle.cancel();
			options.scope.throwIfAborted();
		}
	};

	const processSlice = () => {
		handle.process(Math.max(1, slicer.remainingMs), handle.lastSampleTimeMs + TERRAIN_HEADLESS_SAMPLE_INTERVAL_MS, clock);
		handle.flush();
	};

	let timeMs = 0;
	for (let i = 0; i < worldPoints.length; ++i) {
		const point = worldPoints[i];
		if (Number.isFinite(point[0]) && Number.isFinite(point[1])) {
			handle.addWorldPoint(point[0], point[1], timeMs);
		} else {
			handle.breakPath();
		}

		timeMs += TERRAIN_HEADLESS_SAMPLE_INTERVAL_MS;

		if (slicer.shouldYield || (i & 63) === 63) {
			processSlice();
			options.onProgress?.((i + 1) / worldPoints.length);

			if (slicer.shouldYield) {
				await slicer.yield();
				checkAbort();
			}
		}
	}

	for (;;) {
		processSlice();
		if (handle.pending === 0) {
			break;
		}

		await slicer.yield();
		checkAbort();
	}

	checkAbort();
	options.onProgress?.(1);
	handle.end();
}

/**
 * Vertical projection of a world XZ point on the terrain (§3.5 applyStroke): the vertical world line through the point is intersected
 * with the horizontal local plane at the surface height (two passes starting at `referenceY`; exact for terrains that are not tilted).
 * Returns the local point (y = surface height under it, clamped to the grid) or null when the vertical line is parallel to the local XZ plane.
 * @param edit defines the terrain.
 * @param worldX defines the world X coordinate (cm).
 * @param worldZ defines the world Z coordinate (cm).
 * @param referenceY defines the local height of the first pass (default 0).
 */
export function projectTerrainWorldPoint(edit: ITerrainEditTarget, worldX: number, worldZ: number, referenceY: number = 0): { x: number; y: number; z: number } | null {
	const { grid, heights } = edit.target;
	const local = edit.toLocalRay(new Ray(new Vector3(worldX, 0, worldZ), new Vector3(0, -1, 0), 1));

	const first = intersectLocalPlane(local, referenceY, true);
	if (!first) {
		return null;
	}

	const height = sampleTerrainHeight(heights, grid, clamp(first.x, grid.width), clamp(first.z, grid.height));
	const second = intersectLocalPlane(local, height, true) ?? first;

	return { x: second.x, y: height, z: second.z };
}

/**
 * Intersection of a local ray with the horizontal local plane at height y. With `line`, the whole line is used (vertical projections);
 * otherwise points behind the origin (t < 0) are rejected (§4.3.1). null when the ray is parallel to the plane.
 */
function intersectLocalPlane(ray: ITerrainLocalRay, y: number, line: boolean): { x: number; z: number } | null {
	const scale = Math.abs(ray.dx) + Math.abs(ray.dy) + Math.abs(ray.dz);
	if (!(scale > 0) || Math.abs(ray.dy) < 1e-9 * scale) {
		return null;
	}

	const t = (y - ray.oy) / ray.dy;
	if (!Number.isFinite(t) || (!line && t < 0)) {
		return null;
	}

	return { x: ray.ox + t * ray.dx, z: ray.oz + t * ray.dz };
}

function clamp(value: number, size: number): number {
	const half = size * 0.5;
	return Math.min(half, Math.max(-half, value));
}

function getNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function reportStrokeError(error: unknown): void {
	console.error(`[Terrain] Stroke error: ${error instanceof Error ? error.message : String(error)}`);
}
