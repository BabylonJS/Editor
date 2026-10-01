import { TerrainDabEmitter } from "./dab-emitter";
import { createTerrainFalloffLut } from "./falloff";
import { createTerrainFilterEvaluator, type ITerrainFilterEvaluator } from "./filters";
import { createTerrainResourceSpace, rasterizeTerrainDab, type ITerrainResourceSpace } from "./footprint";
import { sampleTerrainHeight } from "./heightfield";
import { TerrainTileJournal } from "./journal";
import { applyTerrainHydraulicErosion, applyTerrainThermalErosion } from "./kernels/erosion";
import { applyTerrainHoles } from "./kernels/holes";
import { applyTerrainBlend, applyTerrainPaint, applyTerrainReplace, type ITerrainPaintContext } from "./kernels/paint";
import { applyTerrainRamp, getTerrainRampRect, type ITerrainRampSegment } from "./kernels/ramp";
import {
	applyTerrainFlatten,
	applyTerrainNoise,
	applyTerrainRaise,
	applyTerrainSmooth,
	applyTerrainStamp,
	applyTerrainTerrace,
	createTerrainScratch,
	fitTerrainPlane,
	type ITerrainHeightKernelContext,
	type ITerrainScratch,
	type ITerrainToolState,
} from "./kernels/sculpt";
import { createTerrainNoise, type ITerrainNoise } from "./noise";
import { mulberry32 } from "./random";
import { expandTerrainRect, isTerrainRectEmpty, unionTerrainRect } from "./rect";
import type {
	ITerrainDab,
	ITerrainDabWeights,
	ITerrainRect,
	ITerrainSculptOptions,
	ITerrainStrokeConfig,
	ITerrainStrokePreview,
	ITerrainStrokeRequest,
	ITerrainStrokeSample,
	ITerrainStrokeTarget,
	TerrainRectsByKind,
	TerrainResourceKind,
	TerrainTool,
} from "./types";

/** Tools applied to the heights with the vertex resource space. */
const TERRAIN_HEIGHT_TOOLS: ReadonlySet<TerrainTool> = new Set<TerrainTool>(["raise", "smooth", "flatten", "set-height", "noise", "terrace", "erode", "stamp"]);
/** Tools applied to the weight maps with the texel resource space. */
const TERRAIN_WEIGHT_TOOLS: ReadonlySet<TerrainTool> = new Set<TerrainTool>(["paint", "blend", "replace"]);
/** Tools without airbrush (§1.6: single application or binary result). */
const TERRAIN_NO_AIRBRUSH_TOOLS: ReadonlySet<TerrainTool> = new Set<TerrainTool>(["ramp", "stamp", "holes"]);

type TerrainStrokeEngineStatus = "active" | "finished" | "cancelled";
type TerrainMirror = "none" | "x" | "z" | "xz";

interface ITerrainPendingRamp {
	segment: ITerrainRampSegment;
	radius: number;
	strength: number;
}

/**
 * One stroke of one tool on one terrain (§2.4): samples → dab emitter → rasterization (footprint × filters) → journal.touch(write rect)
 * → kernel → target.markDirty. Pure: works on the target's arrays in place, never touches Babylon.
 *
 * Conventions shared with the engine (WP3):
 * - Inversion: request.invert is the effective inversion at the start of the stroke and each sample carries the effective inversion at
 *   that sample (sticky toggle, Shift). A dab is inverted when request.invert XOR (sample.invert XOR first sample.invert), so
 *   live modifier changes apply to the following dabs, and samples carrying a constant flag (headless strokes) keep request.invert.
 * - Kernel contexts: strength = dab.strength (after jitter, WITHOUT amountScale; kernels read dab.amountScale), invert =
 *   the effective inversion; paint flow and blend/replace amounts = dab.strength × dab.amountScale.
 * - Stroke-start state (§4.4): flatten "stroke-start" target and stamp base = height at the first dab centre, "fixed"/set-height target
 *   = worldToLocalHeight(heightWorld), slope plane fitted over the first rasterized dab, all captured before any write.
 * - Write rects touched in the journal (§7.1): dab rect (erosion: ⊕ 1 thermal, ⊕ 2 hydraulic), quad rect (holes), texel rect on every
 *   existing weight map (paint tools), segment bounds ⊕ R (ramp, applied once by finish()).
 */
export class TerrainStrokeEngine {
	public readonly journal: TerrainTileJournal;

	private readonly _target: ITerrainStrokeTarget;
	private readonly _config: ITerrainStrokeConfig;
	private readonly _request: ITerrainStrokeRequest;
	private readonly _tool: TerrainTool;

	private readonly _emitter: TerrainDabEmitter;
	private readonly _lut: Float32Array;
	private readonly _filters: ITerrainFilterEvaluator | null;
	private readonly _space: ITerrainResourceSpace | null;
	private readonly _scratch: ITerrainScratch;
	private readonly _noise: ITerrainNoise | null;
	private readonly _clampLocal: { min: number; max: number } | null;

	private readonly _dabWeights: ITerrainDabWeights = { rect: { x0: 0, y0: 0, x1: -1, y1: -1 }, stride: 0, weights: new Float32Array(0) };
	private readonly _state: ITerrainToolState = { flattenTargetLocal: null, flattenPlane: null, stampBaseLocal: null };
	private readonly _heightContext: ITerrainHeightKernelContext | null;
	private readonly _paintContext: ITerrainPaintContext | null;

	private readonly _preview: ITerrainStrokePreview = { rampStart: null, rampEnd: null, targetLocalHeight: null, lazyCenter: null };
	private readonly _dirty: TerrainRectsByKind = {};

	private _queue: ITerrainDab[] = [];
	private _queueStart: number = 0;
	private _status: TerrainStrokeEngineStatus = "active";
	private _firstDabApplied: boolean = false;
	private _needsSlopePlane: boolean = false;
	private _firstInvert: boolean | null = null;
	private _lastSample: { mx: number; mz: number; invert: boolean } | null = null;
	private _rampDabs: ITerrainDab[] = [];

	public constructor(target: ITerrainStrokeTarget, config: ITerrainStrokeConfig) {
		const request = config.request;
		const grid = target.grid;
		const metric = target.metric;

		this._target = target;
		this._config = config;
		this._request = request;
		this._tool = request.tool;

		// Signature of §7.1, taken at stroke start: a payload recorded now is only applied to the same grid and weight map size.
		this.journal = new TerrainTileJournal(config.provider, `${grid.signature}|${target.weights?.size ?? 0}`);

		this._lut = createTerrainFalloffLut(request.shape.falloff, request.shape.hardness);
		this._filters = this._tool === "ramp" ? null : createTerrainFilterEvaluator(request.filters, target.surface, target.weights, grid, config.filterLayerIndex);
		this._space = this._createResourceSpace();
		this._scratch = createTerrainScratch();
		this._noise = this._tool === "noise" ? createTerrainNoise(request.sculpt.noise.seed) : null;

		const heightClamp = request.sculpt.heightClamp;
		if (heightClamp.enabled) {
			const a = target.worldToLocalHeight(heightClamp.minWorld);
			const b = target.worldToLocalHeight(heightClamp.maxWorld);
			this._clampLocal = { min: Math.min(a, b), max: Math.max(a, b) };
		} else {
			this._clampLocal = null;
		}

		this._heightContext = TERRAIN_HEIGHT_TOOLS.has(this._tool) ? this._createHeightContext() : null;
		this._paintContext = this._tool === "paint" && target.weights ? this._createPaintContext() : null;

		const singleDab = this._tool === "ramp" || (this._tool === "stamp" && request.sculpt.stamp.onClickOnly);
		this._emitter = new TerrainDabEmitter({
			brush: request.brush,
			strength: request.strength,
			airbrush: request.airbrush && !TERRAIN_NO_AIRBRUSH_TOOLS.has(this._tool),
			singleDab,
			seed: request.seed,
			minSpacing: 0.25 * Math.min(grid.cellX * metric.sx, grid.cellZ * metric.sz),
			symmetryCenter: { mx: 0, mz: 0 },
		});

		// Targets known before the first dab (fixed heights) are previewed at once.
		if (this._tool === "set-height") {
			this._state.flattenTargetLocal = target.worldToLocalHeight(request.sculpt.setHeight.heightWorld);
		} else if (this._tool === "flatten" && request.sculpt.flatten.target === "fixed") {
			this._state.flattenTargetLocal = target.worldToLocalHeight(request.sculpt.flatten.heightWorld);
		}

		this._needsSlopePlane = this._tool === "flatten" && request.sculpt.flatten.target === "slope";
		this._updatePreview();
	}

	/** Ramp ends (local), target height of Flatten/Set height (local, null for a slope plane) and lazy-mouse centre (metric-local, when smoothing > 0). */
	public get preview(): Readonly<ITerrainStrokePreview> {
		return this._preview;
	}

	/** Union of the rects written since the start of the stroke. */
	public get dirty(): Readonly<TerrainRectsByKind> {
		return this._dirty;
	}

	public addSample(sample: ITerrainStrokeSample): void {
		if (this._status !== "active") {
			return;
		}

		if (Number.isFinite(sample.mx) && Number.isFinite(sample.mz)) {
			this._firstInvert ??= sample.invert;
			this._lastSample = { mx: sample.mx, mz: sample.mz, invert: sample.invert };
		}

		this._emitter.addSample(sample);

		// A ramp only records its first dab (A) and its last sample (B): consume at once so the preview shows A immediately
		// (no airbrush for the ramp, so draining is time independent).
		if (this._tool === "ramp") {
			this._emitter.drain(Number.POSITIVE_INFINITY, this._queue);
			this._applyQueuedDabs(Number.POSITIVE_INFINITY, null);
			this._updatePreview();
		}
	}

	public breakPath(): void {
		if (this._status === "active") {
			this._emitter.breakPath();
		}
	}

	/** Applies queued dabs until budgetMs elapsed (clock defaults to performance.now); at least one dab per call when some are due. */
	public process(budgetMs: number, nowMs: number, clock?: () => number): { dabs: number; pending: number } {
		if (this._status !== "active") {
			return { dabs: 0, pending: 0 };
		}

		const now = clock ?? getTerrainNow;
		const start = now();

		this._emitter.drain(nowMs, this._queue);
		const dabs = this._applyQueuedDabs(budgetMs, () => now() - start);
		this._updatePreview();

		return { dabs, pending: this._queue.length - this._queueStart };
	}

	/** Drains every remaining dab (and applies the ramp), returns the dirty rects (union since the start of the stroke; {} after cancel()). */
	public finish(): TerrainRectsByKind {
		if (this._status === "cancelled") {
			return {};
		}

		if (this._status === "active") {
			this._emitter.finish(this._queue);
			this._applyQueuedDabs(Number.POSITIVE_INFINITY, null);

			this._updatePreview();
			this._status = "finished";

			if (this._tool === "ramp") {
				this._applyRamp();
			}
		}

		return { ...this._dirty };
	}

	/** journal.revert(); returns the restored rects (also marked dirty on the target so the engine flushes them). */
	public cancel(): TerrainRectsByKind {
		if (this._status === "cancelled") {
			return {};
		}

		this._status = "cancelled";
		this._queue = [];
		this._queueStart = 0;

		const restored = this.journal.revert();
		for (const kind of Object.keys(restored) as TerrainResourceKind[]) {
			const rect = restored[kind];
			if (rect && !isTerrainRectEmpty(rect)) {
				this._target.markDirty(kind, rect);
			}
		}

		return restored;
	}

	private _createResourceSpace(): ITerrainResourceSpace | null {
		const target = this._target;

		if (TERRAIN_HEIGHT_TOOLS.has(this._tool)) {
			return createTerrainResourceSpace("vertices", target.grid, target.metric);
		}

		if (this._tool === "holes") {
			return target.grid.subdivisions > 0 ? createTerrainResourceSpace("quads", target.grid, target.metric) : null;
		}

		if (TERRAIN_WEIGHT_TOOLS.has(this._tool) && target.weights && target.weights.size >= 1) {
			return createTerrainResourceSpace("texels", target.grid, target.metric, target.weights.size);
		}

		return null;
	}

	private _createHeightContext(): ITerrainHeightKernelContext {
		const target = this._target;

		return {
			grid: target.grid,
			metric: target.metric,
			heights: target.heights,
			dab: { index: 0, mx: 0, mz: 0, radius: 0, rotation: 0, strength: 0, amountScale: 0, invert: false, seed: 0, mirrored: false },
			dabWeights: this._dabWeights,
			strength: 0,
			invert: false,
			options: this._request.sculpt,
			state: this._state,
			clampLocal: this._clampLocal,
			worldToLocalHeight: (worldY: number): number => target.worldToLocalHeight(worldY),
			scratch: this._scratch,
		};
	}

	private _createPaintContext(): ITerrainPaintContext | null {
		const weights = this._target.weights;
		if (!weights) {
			return null;
		}

		const layer = this._config.layerIndex;
		const size = weights.size;

		return {
			maps: weights,
			dabWeights: this._dabWeights,
			flow: 0,
			opacity: this._request.paint.opacity,
			erase: false,
			layer,
			// §4.10.2: the freed weight goes to layer 0, or to layer 1 when layer 0 is erased (itself on a single-layer terrain: nothing to erase to).
			fallbackLayer: layer === 0 ? (weights.layerCount > 1 ? 1 : 0) : 0,
			before: (texel: number, layerIndex: number): number => {
				const y = Math.floor(texel / size);
				return this.journal.readBefore(layerIndex < 4 ? "weights0" : "weights1", texel - y * size, y, layerIndex & 3);
			},
			coverage: new Map<number, Float32Array>(),
		};
	}

	/** Applies queued dabs; with a budget, stops once elapsed() >= budgetMs (checked after each dab). Returns the number of dabs applied. */
	private _applyQueuedDabs(budgetMs: number, elapsed: (() => number) | null): number {
		let count = 0;
		while (this._queueStart < this._queue.length) {
			const dab = this._queue[this._queueStart++];
			this._applyDab(dab);
			++count;

			if (elapsed && elapsed() >= budgetMs) {
				break;
			}
		}

		if (this._queueStart >= this._queue.length) {
			this._queue = [];
			this._queueStart = 0;
		} else if (this._queueStart > 1024) {
			this._queue = this._queue.slice(this._queueStart);
			this._queueStart = 0;
		}

		return count;
	}

	private _applyDab(dab: ITerrainDab): void {
		if (!this._firstDabApplied) {
			this._firstDabApplied = true;
			this._captureStrokeStart(dab);
		}

		const invert = this._isInverted(dab.invert);

		if (this._tool === "ramp") {
			this._rampDabs.push(dab);
		} else if (this._tool === "holes") {
			this._applyHolesDab(dab, invert);
		} else if (TERRAIN_WEIGHT_TOOLS.has(this._tool)) {
			this._applyWeightsDab(dab, invert);
		} else {
			this._applyHeightDab(dab, invert);
		}
	}

	private _isInverted(sampleInvert: boolean): boolean {
		const first = this._firstInvert ?? sampleInvert;
		return this._request.invert !== (sampleInvert !== first);
	}

	/** Stroke-start state (§4.4, §4.14), read before any write of the stroke. */
	private _captureStrokeStart(dab: ITerrainDab): void {
		const target = this._target;
		const x = dab.mx / target.metric.sx;
		const z = dab.mz / target.metric.sz;

		switch (this._tool) {
			case "flatten":
				if (this._request.sculpt.flatten.target !== "fixed") {
					this._state.flattenTargetLocal = sampleTerrainHeight(target.heights, target.grid, x, z);
				}
				break;

			case "stamp":
				this._state.stampBaseLocal = sampleTerrainHeight(target.heights, target.grid, x, z);
				break;
		}
	}

	private _applyHeightDab(dab: ITerrainDab, invert: boolean): void {
		const space = this._space;
		const context = this._heightContext;
		if (!space || !context) {
			return;
		}

		const target = this._target;
		const dabWeights = this._dabWeights;
		if (!rasterizeTerrainDab(dab, this._request.shape, this._lut, space, this._filters, dabWeights)) {
			return;
		}

		// "Slope plane" flatten target: weighted least squares over the first dab that covers the terrain, before it writes.
		if (this._needsSlopePlane) {
			this._needsSlopePlane = false;
			this._state.flattenPlane = fitTerrainPlane(target.heights, target.grid, dabWeights);
		}

		const erode = this._request.sculpt.erode;
		let writeRect: ITerrainRect = dabWeights.rect;
		if (this._tool === "erode") {
			writeRect = expandTerrainRect(dabWeights.rect, erode.type === "thermal" ? 1 : 2, space.width, space.height);
		}

		this.journal.touch("heights", writeRect);

		context.dab = dab;
		context.dabWeights = dabWeights;
		context.strength = dab.strength;
		context.invert = invert;

		let rect: ITerrainRect | null = null;
		switch (this._tool) {
			case "raise":
				rect = applyTerrainRaise(context);
				break;
			case "smooth":
				rect = applyTerrainSmooth(context);
				break;
			case "flatten":
				rect = applyTerrainFlatten(context, "flatten");
				break;
			case "set-height":
				rect = applyTerrainFlatten(context, "set-height");
				break;
			case "noise":
				rect = this._noise ? applyTerrainNoise(context, this._noise) : null;
				break;
			case "terrace":
				rect = applyTerrainTerrace(context);
				break;
			case "erode":
				rect = erode.type === "thermal" ? applyTerrainThermalErosion(context) : applyTerrainHydraulicErosion(context, mulberry32(dab.seed));
				break;
			case "stamp":
				rect = applyTerrainStamp(context, this._request.shape);
				break;
		}

		this._markWritten("heights", rect);
	}

	private _applyHolesDab(dab: ITerrainDab, invert: boolean): void {
		const space = this._space;
		if (!space) {
			return;
		}

		const target = this._target;
		const dabWeights = this._dabWeights;
		if (!rasterizeTerrainDab(dab, this._request.shape, this._lut, space, this._filters, dabWeights)) {
			return;
		}

		this.journal.touch("holes", dabWeights.rect);
		this._markWritten("holes", applyTerrainHoles(target.holes, dabWeights, invert, this._request.sculpt.holes.threshold));
	}

	private _applyWeightsDab(dab: ITerrainDab, invert: boolean): void {
		const space = this._space;
		const weights = this._target.weights;
		if (!space || !weights) {
			return;
		}

		const layerCount = weights.layerCount;
		const paintContext = this._paintContext;
		let from = this._config.replaceFromLayerIndex;
		let to = this._config.layerIndex;

		switch (this._tool) {
			case "paint":
				if (!paintContext || !(to >= 0 && to < layerCount)) {
					return;
				}
				break;

			case "replace":
				if (invert) {
					[from, to] = [to, from];
				}
				if (!(from >= 0 && from < layerCount && to >= 0 && to < layerCount) || from === to) {
					return;
				}
				break;
		}

		const dabWeights = this._dabWeights;
		if (!rasterizeTerrainDab(dab, this._request.shape, this._lut, space, this._filters, dabWeights)) {
			return;
		}

		// Paint tools renormalize every layer of a texel: every existing map is captured.
		this.journal.touch("weights0", dabWeights.rect);
		if (weights.maps[1]) {
			this.journal.touch("weights1", dabWeights.rect);
		}

		const amount = dab.strength * dab.amountScale;
		const paint = this._request.paint;

		let rect: ITerrainRect | null = null;
		switch (this._tool) {
			case "paint":
				if (paintContext) {
					paintContext.dabWeights = dabWeights;
					paintContext.flow = amount;
					paintContext.erase = invert;
					rect = applyTerrainPaint(paintContext);
				}
				break;

			case "blend":
				rect = applyTerrainBlend(weights, dabWeights, amount, paint.blendKernel, this._scratch);
				break;

			case "replace":
				rect = applyTerrainReplace(weights, dabWeights, from, to, amount, paint.replaceThreshold);
				break;
		}

		this._markWritten("weights0", rect);
		if (weights.maps[1]) {
			this._markWritten("weights1", rect);
		}
	}

	/** Ramp (§4.14), applied once at finish: A = first dab centre (and its symmetry copies), B = last sample (mirrored alike). */
	private _applyRamp(): void {
		const last = this._lastSample;
		if (!this._rampDabs.length || !last) {
			return;
		}

		const target = this._target;
		const ramp = this._request.sculpt.ramp;
		const options: ITerrainSculptOptions["ramp"] = this._isInverted(last.invert) ? { ...ramp, mode: "lower" } : ramp;
		const mirrors = getTerrainMirrors(this._request.brush.symmetry);

		// Every end height is sampled before any segment writes (symmetric copies must not see each other).
		const pending: ITerrainPendingRamp[] = [];
		for (let k = 0; k < this._rampDabs.length; ++k) {
			const dab = this._rampDabs[k];
			const end = mirrorTerrainPoint(last.mx, last.mz, mirrors[k] ?? "none");
			const segment = this._createRampSegment(dab.mx, dab.mz, end.mx, end.mz);
			if (segment) {
				pending.push({ segment, radius: dab.radius, strength: dab.strength });
			}
		}

		for (const item of pending) {
			// The kernel's own write bounds (segment bounds ⊕ R, §7.1).
			const rect = getTerrainRampRect(target.grid, target.metric, item.segment, item.radius);
			if (!rect) {
				continue;
			}

			this.journal.touch("heights", rect);
			this._markWritten(
				"heights",
				applyTerrainRamp({
					heights: target.heights,
					grid: target.grid,
					metric: target.metric,
					segment: item.segment,
					radius: item.radius,
					shape: this._request.shape,
					strength: item.strength,
					options,
					clampLocal: this._clampLocal,
				})
			);
		}
	}

	private _createRampSegment(amx: number, amz: number, bmx: number, bmz: number): ITerrainRampSegment | null {
		const target = this._target;
		const ramp = this._request.sculpt.ramp;
		const ax = amx / target.metric.sx;
		const az = amz / target.metric.sz;
		const bx = bmx / target.metric.sx;
		const bz = bmz / target.metric.sz;

		if (![ax, az, bx, bz].every(Number.isFinite)) {
			return null;
		}

		const fromTerrain = ramp.endHeights === "terrain";
		return {
			ax,
			az,
			ah: fromTerrain ? sampleTerrainHeight(target.heights, target.grid, ax, az) : target.worldToLocalHeight(ramp.startWorld),
			bx,
			bz,
			bh: fromTerrain ? sampleTerrainHeight(target.heights, target.grid, bx, bz) : target.worldToLocalHeight(ramp.endWorld),
		};
	}

	private _markWritten(kind: TerrainResourceKind, rect: ITerrainRect | null): void {
		if (!rect || isTerrainRectEmpty(rect)) {
			return;
		}

		this._dirty[kind] = unionTerrainRect(this._dirty[kind], rect);
		this._target.markDirty(kind, rect);
	}

	private _updatePreview(): void {
		const target = this._target;
		const preview = this._preview;

		preview.lazyCenter = this._request.brush.smoothing > 0 ? this._emitter.lazyCenter : null;

		if (this._tool === "set-height") {
			preview.targetLocalHeight = this._state.flattenTargetLocal;
		} else if (this._tool === "flatten") {
			// A slope plane has no single target height (no disc in the viewport).
			preview.targetLocalHeight = this._request.sculpt.flatten.target === "slope" ? null : this._state.flattenTargetLocal;
		}

		if (this._tool === "ramp") {
			const first = this._rampDabs[0];
			const last = this._lastSample;

			const segment = first && last ? this._createRampSegment(first.mx, first.mz, last.mx, last.mz) : null;
			if (segment) {
				preview.rampStart = { x: segment.ax, y: segment.ah, z: segment.az };
				preview.rampEnd = { x: segment.bx, y: segment.bh, z: segment.bz };
			} else if (first) {
				const x = first.mx / target.metric.sx;
				const z = first.mz / target.metric.sz;
				preview.rampStart = { x, y: sampleTerrainHeight(target.heights, target.grid, x, z), z };
			}
		}
	}
}

function getTerrainNow(): number {
	return performance.now();
}

/** Mirror transform of each dab of one emitted set, in the emitter's order (primary, then X, Z, XZ copies). */
function getTerrainMirrors(symmetry: string): TerrainMirror[] {
	switch (symmetry) {
		case "x":
			return ["none", "x"];
		case "z":
			return ["none", "z"];
		case "xz":
			return ["none", "x", "z", "xz"];
		default:
			return ["none"];
	}
}

/** Mirrors a metric-local point across the terrain's centre lines (symmetry centre (0, 0), §4.3.2). */
function mirrorTerrainPoint(mx: number, mz: number, mirror: TerrainMirror): { mx: number; mz: number } {
	switch (mirror) {
		case "x":
			return { mx: -mx, mz };
		case "z":
			return { mx, mz: -mz };
		case "xz":
			return { mx: -mx, mz: -mz };
		default:
			return { mx, mz };
	}
}
