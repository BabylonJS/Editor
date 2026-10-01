import { sampleTerrainHeight } from "../heightfield";
import { sampleTerrainFractal, type ITerrainNoise } from "../noise";
import type { ITerrainBrushShape, ITerrainDab, ITerrainDabWeights, ITerrainGrid, ITerrainMetric, ITerrainRect, ITerrainSculptOptions, TerrainBandMode } from "../types";

/**
 * Per-stroke state of the height kernels. The stroke engine creates it with null values at stroke start; the kernels capture the
 * stroke-start values lazily at the first dab (§4.4) unless the engine already set them (for example for the target-height preview).
 */
export interface ITerrainToolState {
	/** Flatten "stroke-start" target: local height at the first dab centre. */
	flattenTargetLocal: number | null;
	/** Flatten "slope" target: local h = a x + b z + c, fitted over the first dab (fitTerrainPlane). */
	flattenPlane: { a: number; b: number; c: number } | null;
	/** Stamp base: local height at the first dab centre. */
	stampBaseLocal: number | null;
}

/**
 * Reusable scratch buffers, one per slot. A call returns a view of exactly `length` elements whose content is unspecified (it is reused
 * across calls). Slots 0 to 15 are free for callers (the stroke engine); the kernels of core/kernels only use slots 16 and above.
 */
export interface ITerrainScratch {
	floats(length: number, slot: number): Float32Array;
	bytes(length: number, slot: number): Uint8Array;
}

/**
 * Inputs of one height kernel call (one dab). Kernels write `heights` in place, inside `dabWeights.rect` (thermal erosion: rect ⊕ 1,
 * hydraulic erosion: rect ⊕ 2), and return the rect of the elements they wrote, or null when nothing was written.
 * The per-element amount is `a = w × dab.strength × dab.amountScale` (§4.3.3), w being the dab weight of the element.
 */
export interface ITerrainHeightKernelContext {
	grid: ITerrainGrid;
	metric: ITerrainMetric;
	/** (S+1)² local heights, row 0 = +Z edge. */
	heights: Float32Array;
	/** The dab: centre (metric-local), radius (world cm), strength' (after pressure and jitter) and amountScale. */
	dab: ITerrainDab;
	/** Dab weights in vertex space. */
	dabWeights: ITerrainDabWeights;
	/** strength' of the dab (dab.strength: after pressure and jitter, without the spacing normalization). The kernels read `dab` directly (§4.3.3). */
	strength: number;
	/** Effective inversion (Shift / X): lower, sharpen, swapped flatten modes, subtracted noise, swapped stamp blends, deposit-only hydraulic erosion. */
	invert: boolean;
	options: ITerrainSculptOptions;
	state: ITerrainToolState;
	/** Height clamp in local units (every written element is clamped), null when disabled. */
	clampLocal: { min: number; max: number } | null;
	worldToLocalHeight(worldY: number): number;
	scratch: ITerrainScratch;
}

/** First scratch slot used by the kernels (see ITerrainScratch). */
const KERNEL_SCRATCH_SLOT = 16;

/** Padded row offsets of the vertical tent pass of the smooth kernel. */
let smoothRowOffsets = new Int32Array(0);

class TerrainScratch implements ITerrainScratch {
	private readonly _floatBuffers = new Map<number, Float32Array>();
	private readonly _floatViews = new Map<number, Float32Array>();
	private readonly _byteBuffers = new Map<number, Uint8Array>();
	private readonly _byteViews = new Map<number, Uint8Array>();

	public floats(length: number, slot: number): Float32Array {
		const count = Math.max(0, Math.floor(length));
		const view = this._floatViews.get(slot);
		if (view && view.length === count) {
			return view;
		}

		let buffer = this._floatBuffers.get(slot);
		if (!buffer || buffer.length < count) {
			buffer = new Float32Array(Math.max(count, Math.ceil((buffer?.length ?? 0) * 1.5)));
			this._floatBuffers.set(slot, buffer);
		}

		const result = buffer.length === count ? buffer : buffer.subarray(0, count);
		this._floatViews.set(slot, result);
		return result;
	}

	public bytes(length: number, slot: number): Uint8Array {
		const count = Math.max(0, Math.floor(length));
		const view = this._byteViews.get(slot);
		if (view && view.length === count) {
			return view;
		}

		let buffer = this._byteBuffers.get(slot);
		if (!buffer || buffer.length < count) {
			buffer = new Uint8Array(Math.max(count, Math.ceil((buffer?.length ?? 0) * 1.5)));
			this._byteBuffers.set(slot, buffer);
		}

		const result = buffer.length === count ? buffer : buffer.subarray(0, count);
		this._byteViews.set(slot, result);
		return result;
	}
}

/** Scratch buffers growing on demand (see ITerrainScratch). */
export function createTerrainScratch(): ITerrainScratch {
	return new TerrainScratch();
}

/** The dab rect clamped to a width x height resource, null when empty. */
function clampDabRect(rect: ITerrainRect, width: number, height: number): ITerrainRect | null {
	const x0 = Math.max(rect.x0, 0);
	const y0 = Math.max(rect.y0, 0);
	const x1 = Math.min(rect.x1, width - 1);
	const y1 = Math.min(rect.y1, height - 1);
	if (x1 < x0 || y1 < y0) {
		return null;
	}

	return { x0, y0, x1, y1 };
}

/** strength' × amountScale of a dab (§4.3.3). */
function getDabAmount(dab: ITerrainDab): number {
	const amount = dab.strength * dab.amountScale;
	return amount > 0 && amount < Infinity ? amount : 0;
}

function getClampMin(clampLocal: { min: number; max: number } | null): number {
	return clampLocal ? Math.min(clampLocal.min, clampLocal.max) : -Infinity;
}

function getClampMax(clampLocal: { min: number; max: number } | null): number {
	return clampLocal ? Math.max(clampLocal.min, clampLocal.max) : Infinity;
}

function swapBandMode(mode: TerrainBandMode): TerrainBandMode {
	return mode === "raise" ? "lower" : mode === "lower" ? "raise" : mode;
}

function createRect(x0: number, y0: number, x1: number, y1: number): ITerrainRect | null {
	return x1 < x0 || y1 < y0 ? null : { x0, y0, x1, y1 };
}

/** Radius (cells) of the smooth box blur: smoothKernel (1..16) or auto clamp(round(R / cellWorld × 0.25), 1, 8) (§4.4). */
function getSmoothKernelRadius(smoothKernel: number, radius: number, grid: ITerrainGrid, metric: ITerrainMetric): number {
	if (smoothKernel >= 1) {
		return Math.min(16, Math.max(1, Math.round(smoothKernel)));
	}

	const cellWorld = Math.min(grid.cellX * metric.sx, grid.cellZ * metric.sz);
	if (!(cellWorld > 0)) {
		return 1;
	}

	return Math.min(8, Math.max(1, Math.round((radius / cellWorld) * 0.25)));
}

/**
 * Index of the sample s'(z) of a line of `length` samples padded by 2k on both sides so that ONE tent pass (the box of radius k convolved
 * with itself) over s' equals the edge-clamped box blur of radius k applied twice: s'(z) = s(0) for z in [-k, -1],
 * s'(z) = s(min(z + 2k + 1, length - 1)) for z in [-2k, -k - 1], and the mirror image beyond the last sample.
 */
function getTentPaddedIndex(z: number, length: number, kernel: number): number {
	const last = length - 1;
	if (z < 0) {
		if (z >= -kernel) {
			return 0;
		}

		const mirrored = z + 2 * kernel + 1;
		return mirrored > last ? last : mirrored;
	}

	if (z > last) {
		if (z <= last + kernel) {
			return last;
		}

		const mirrored = z - 2 * kernel - 1;
		return mirrored < 0 ? 0 : mirrored;
	}

	return z;
}

/**
 * Raise / lower (§4.4): h += s × a × 0.5 R / sy.
 */
export function applyTerrainRaise(context: ITerrainHeightKernelContext): ITerrainRect | null {
	const { grid, heights, dabWeights, dab } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const scale = ((context.invert ? -1 : 1) * getDabAmount(dab) * 0.5 * dab.radius) / context.metric.sy;
	if (!bounds || scale === 0 || !Number.isFinite(scale)) {
		return null;
	}

	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const heightRow = y * columns;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const value = heights[heightRow + x] + w * scale;
			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Smooth / sharpen (§4.4): B = separable edge-clamped box blur of radius k applied twice, computed from the heights before the dab (Jacobi)
 * as one tent pass per axis (exactly the double box, see getTentPaddedIndex); smooth h += (B − h) min(1, 4a), sharpen (invert)
 * h += (h − B) × 2a. B is the exact blur of the whole grid (the passes read up to 2k elements around the dab rect).
 * The vertical tent runs first (one running-sum triple per column), the horizontal tent then runs row by row with the height update merged.
 */
export function applyTerrainSmooth(context: ITerrainHeightKernelContext): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const amount = getDabAmount(dab);
	if (!bounds || !(amount > 0)) {
		return null;
	}

	const kernel = getSmoothKernelRadius(context.options.smoothKernel, dab.radius, grid, metric);
	const span = 2 * kernel;
	const tentWidth = span + 1;
	const normalization = 1 / (tentWidth * tentWidth);
	const columns = grid.columns;
	const rows = grid.rows;
	const lastColumn = columns - 1;
	const boundsWidth = bounds.x1 - bounds.x0 + 1;
	const boundsHeight = bounds.y1 - bounds.y0 + 1;

	// 1. Vertical tent of the columns the horizontal tent reads (bounds ⊕ 2k, +1 for the last running update), rows of the bounds.
	const columnStart = Math.max(0, bounds.x0 - span);
	const columnEnd = Math.min(lastColumn, bounds.x1 + span + 1);
	const count = columnEnd - columnStart + 1;
	const vertical = context.scratch.floats(boundsHeight * count, KERNEL_SCRATCH_SLOT);

	// Column by column: the running sums T (tent), R (box of the 2k + 1 rows after y) and L (box of the 2k + 1 rows up to y) stay in
	// registers; the rows each column visits stay in the L1 cache for the next column. Row offsets go through the padding once per call.
	const rowCount = boundsHeight + 2 * span + 2;
	if (smoothRowOffsets.length < rowCount) {
		smoothRowOffsets = new Int32Array(Math.max(rowCount, smoothRowOffsets.length * 2));
	}

	const rowOffsets = smoothRowOffsets;
	for (let j = 0; j < rowCount; ++j) {
		rowOffsets[j] = getTentPaddedIndex(bounds.y0 - span + j, rows, kernel) * columns + columnStart;
	}

	for (let i = 0; i < count; ++i) {
		let tent = 0;
		let right = 0;
		let left = 0;
		for (let j = 0; j <= span; ++j) {
			const value = heights[rowOffsets[j] + i];
			tent += (j + 1) * value;
			left += value;
		}
		for (let j = span + 1; j < 2 * span + 1; ++j) {
			const value = heights[rowOffsets[j] + i];
			tent += (2 * span + 1 - j) * value;
			right += value;
		}
		right += heights[rowOffsets[2 * span + 1] + i];

		for (let y = 0; ; ++y) {
			vertical[y * count + i] = tent * normalization;
			if (y === boundsHeight - 1) {
				break;
			}

			const next = heights[rowOffsets[y + span + 1] + i];
			tent += right - left;
			right += heights[rowOffsets[y + 2 * span + 2] + i] - next;
			left += next - heights[rowOffsets[y] + i];
		}
	}

	// 2. Horizontal tent per row over the window line[i] = s'(bounds.x0 − 2k + i) (i up to boundsWidth + 4k: the samples the running sums
	// read), copied from the vertical buffer with the padding of getTentPaddedIndex at the grid's left and right edges, merged with the update.
	const lineLength = boundsWidth + 2 * span + 1;
	const lineStart = bounds.x0 - span;
	const insideStart = Math.max(0, -lineStart);
	const insideEnd = Math.min(lineLength, lastColumn + 1 - lineStart);
	const line = context.scratch.floats(lineLength, KERNEL_SCRATCH_SLOT + 1);

	const sharpen = context.invert;
	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const lastIndex = boundsWidth - 1;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const verticalRow = (y - bounds.y0) * count - columnStart;
		for (let i = 0; i < insideStart; ++i) {
			line[i] = vertical[verticalRow + getTentPaddedIndex(lineStart + i, columns, kernel)];
		}
		line.set(vertical.subarray(verticalRow + lineStart + insideStart, verticalRow + lineStart + insideEnd), insideStart);
		for (let i = insideEnd; i < lineLength; ++i) {
			line[i] = vertical[verticalRow + getTentPaddedIndex(lineStart + i, columns, kernel)];
		}

		let tent = 0;
		let right = 0;
		let left = 0;
		for (let j = -span; j <= 0; ++j) {
			const value = line[span + j];
			tent += (tentWidth + j) * value;
			left += value;
		}
		for (let j = 1; j <= span; ++j) {
			const value = line[span + j];
			tent += (tentWidth - j) * value;
			right += value;
		}
		right += line[2 * span + 1];

		const weightRow = (y - rect.y0) * stride - rect.x0 + bounds.x0;
		const heightRow = y * columns + bounds.x0;
		let first = -1;
		let last = -1;

		for (let i = 0; ; ++i) {
			const w = weights[weightRow + i];
			if (w > 0) {
				const a = w * amount;
				const h = heights[heightRow + i];
				const b = tent * normalization;
				const value = sharpen ? h + (h - b) * 2 * a : h + (b - h) * (a < 0.25 ? 4 * a : 1);
				heights[heightRow + i] = value < lo ? lo : value > hi ? hi : value;

				if (first < 0) {
					first = i;
				}
				last = i;
			}

			if (i === lastIndex) {
				break;
			}

			const next = line[i + span + 1];
			tent += right - left;
			right += line[i + 2 * span + 2] - next;
			left += next - line[i];
		}

		if (first >= 0) {
			minX = Math.min(minX, bounds.x0 + first);
			maxX = Math.max(maxX, bounds.x0 + last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Flatten and set height (§4.4): Δ = (T − h) min(1, 4a). Flatten targets: "stroke-start" (height at the first dab centre, captured in
 * state.flattenTargetLocal), "fixed" (worldToLocalHeight(heightWorld)), "slope" (plane fitted over the first dab, captured in state.flattenPlane).
 * Set height: worldToLocalHeight(setHeight.heightWorld). Mode "raise" keeps Δ > 0, "lower" keeps Δ < 0; invert swaps them.
 */
export function applyTerrainFlatten(context: ITerrainHeightKernelContext, tool: "flatten" | "set-height"): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab, options, state } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const amount = getDabAmount(dab);
	if (!bounds || !(amount > 0)) {
		return null;
	}

	let mode: TerrainBandMode;
	let target = 0;
	let plane: { a: number; b: number; c: number } | null = null;

	if (tool === "set-height") {
		mode = options.setHeight.mode;
		target = context.worldToLocalHeight(options.setHeight.heightWorld);
	} else {
		mode = options.flatten.mode;
		switch (options.flatten.target) {
			case "fixed":
				target = context.worldToLocalHeight(options.flatten.heightWorld);
				break;
			case "slope":
				plane = state.flattenPlane ??= fitTerrainPlane(heights, grid, dabWeights);
				break;
			default:
				target = state.flattenTargetLocal ??= sampleTerrainHeight(heights, grid, dab.mx / metric.sx, dab.mz / metric.sz);
				break;
		}
	}

	if (!Number.isFinite(target)) {
		return null;
	}

	if (context.invert) {
		mode = swapBandMode(mode);
	}

	const raiseOnly = mode === "raise";
	const lowerOnly = mode === "lower";
	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const heightRow = y * columns;
		const z = halfHeight - y * grid.cellZ;
		const rowTarget = plane ? plane.b * z + plane.c : target;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const a = w * amount;
			const h = heights[heightRow + x];
			const elementTarget = plane ? plane.a * (x * grid.cellX - halfWidth) + rowTarget : rowTarget;
			const delta = (elementTarget - h) * (a < 0.25 ? 4 * a : 1);
			if ((raiseOnly && !(delta > 0)) || (lowerOnly && !(delta < 0))) {
				continue;
			}

			const value = h + delta;
			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Noise (§4.4): n = sampleTerrainFractal(noise, mx / scale, mz / scale) at the element's metric-local position (world-locked);
 * bipolar Δ = n, raise Δ = n × 0.5 + 0.5; h += s × a × amplitude × Δ / sy. `noise` is createTerrainNoise(options.noise.seed).
 */
export function applyTerrainNoise(context: ITerrainHeightKernelContext, noise: ITerrainNoise): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const amount = getDabAmount(dab);
	const settings = context.options.noise;
	const factor = ((context.invert ? -1 : 1) * amount * settings.amplitude) / metric.sy;
	if (!bounds || factor === 0 || !Number.isFinite(factor)) {
		return null;
	}

	const inverseScale = 1 / Math.max(settings.scale, 1e-6);
	const fractal = { type: settings.type, octaves: settings.octaves, persistence: settings.persistence, lacunarity: settings.lacunarity };
	const raiseOnly = settings.mode === "raise";
	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const heightRow = y * columns;
		const noiseY = (halfHeight - y * grid.cellZ) * metric.sz * inverseScale;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const n = sampleTerrainFractal(noise, (x * grid.cellX - halfWidth) * metric.sx * inverseScale, noiseY, fractal);
			const delta = raiseOnly ? n * 0.5 + 0.5 : n;
			const value = heights[heightRow + x] + factor * w * delta;
			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Terrace (§4.4): Y = localToWorld(h), t = (Y − offset) / step, k = mix(1, 12, sharpness), Yt = offset + step (floor(t) + fract(t)^k),
 * h += (worldToLocal(Yt) − h) min(1, 4a). localToWorld is the inverse of the affine worldToLocalHeight.
 */
export function applyTerrainTerrace(context: ITerrainHeightKernelContext): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const amount = getDabAmount(dab);
	const { step, sharpness, offset } = context.options.terrace;
	if (!bounds || !(amount > 0) || !(step > 1e-6) || !Number.isFinite(offset)) {
		return null;
	}

	const exponent = 1 + 11 * Math.min(1, Math.max(0, sharpness || 0));
	const localAtZero = context.worldToLocalHeight(0);
	let localPerWorld = context.worldToLocalHeight(1) - localAtZero;
	if (!(Math.abs(localPerWorld) > 1e-12) || !Number.isFinite(localPerWorld)) {
		localPerWorld = 1 / metric.sy;
	}

	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const heightRow = y * columns;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const a = w * amount;
			const h = heights[heightRow + x];
			const t = ((h - localAtZero) / localPerWorld - offset) / step;
			const floorT = Math.floor(t);
			const terraced = offset + step * (floorT + Math.pow(t - floorT, exponent));
			const value = h + (context.worldToLocalHeight(terraced) - h) * (a < 0.25 ? 4 * a : 1);
			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Stamp (§4.4): base = height at the first dab centre (captured in state.stampBaseLocal), v = heightWorld × w / sy (the dab weight w
 * already carries the brush mask, so `_shape` isn't needed by the formula). add: h += s v strength'; max: h += (max(h, base + v) − h) strength';
 * min: h += (min(h, base − v) − h) strength'; replace: h = mix(h, base + v, strength' × min(1, 4w)). Invert swaps max ↔ min and negates add.
 * strength' is dab.strength (a stamp is one application: no spacing normalization).
 */
export function applyTerrainStamp(context: ITerrainHeightKernelContext, _shape: ITerrainBrushShape): ITerrainRect | null {
	const { grid, metric, heights, dabWeights, dab, state } = context;
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	const strength = dab.strength > 0 ? Math.min(1, dab.strength) : 0;
	const heightScale = context.options.stamp.heightWorld / metric.sy;
	if (!bounds || !(strength > 0) || !Number.isFinite(heightScale)) {
		return null;
	}

	const base = (state.stampBaseLocal ??= sampleTerrainHeight(heights, grid, dab.mx / metric.sx, dab.mz / metric.sz));
	if (!Number.isFinite(base)) {
		return null;
	}

	let blend = context.options.stamp.blend;
	if (context.invert) {
		blend = blend === "max" ? "min" : blend === "min" ? "max" : blend;
	}

	const addScale = (context.invert ? -1 : 1) * strength;
	const lo = getClampMin(context.clampLocal);
	const hi = getClampMax(context.clampLocal);
	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const heightRow = y * columns;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const h = heights[heightRow + x];
			const v = heightScale * w;

			let value: number;
			switch (blend) {
				case "max":
					value = h + (Math.max(h, base + v) - h) * strength;
					break;
				case "min":
					value = h + (Math.min(h, base - v) - h) * strength;
					break;
				case "replace":
					value = h + (base + v - h) * strength * (w < 0.25 ? 4 * w : 1);
					break;
				default:
					value = h + v * addScale;
					break;
			}

			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return createRect(minX, minY, maxX, maxY);
}

/**
 * Weighted least-squares plane over the dab footprint (local units): minimizes Σ w (a x + b z + c − h)² with x, z the local vertex
 * coordinates. Uniform weights when every dab weight is 0; a degenerate footprint (a line or a point) gives the best fit along the
 * dominant axis, or a horizontal plane at the mean height.
 */
export function fitTerrainPlane(heights: Float32Array, grid: ITerrainGrid, dabWeights: ITerrainDabWeights): { a: number; b: number; c: number } {
	const bounds = clampDabRect(dabWeights.rect, grid.columns, grid.rows);
	if (!bounds) {
		return { a: 0, b: 0, c: 0 };
	}

	const { weights, stride, rect } = dabWeights;
	const columns = grid.columns;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	let uniform = false;
	let sumW = 0;
	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = weights[weightRow + x];
			if (w > 0) {
				sumW += w;
			}
		}
	}

	if (!(sumW > 0) || !Number.isFinite(sumW)) {
		uniform = true;
	}

	let totalW = 0;
	let meanX = 0;
	let meanZ = 0;
	let meanH = 0;
	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const z = halfHeight - y * grid.cellZ;
		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = uniform ? 1 : weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			totalW += w;
			meanX += w * (x * grid.cellX - halfWidth);
			meanZ += w * z;
			meanH += w * heights[y * columns + x];
		}
	}

	meanX /= totalW;
	meanZ /= totalW;
	meanH /= totalW;

	let sxx = 0;
	let sxz = 0;
	let szz = 0;
	let sxh = 0;
	let szh = 0;
	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const dz = halfHeight - y * grid.cellZ - meanZ;
		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const w = uniform ? 1 : weights[weightRow + x];
			if (!(w > 0)) {
				continue;
			}

			const dx = x * grid.cellX - halfWidth - meanX;
			const dh = heights[y * columns + x] - meanH;
			sxx += w * dx * dx;
			sxz += w * dx * dz;
			szz += w * dz * dz;
			sxh += w * dx * dh;
			szh += w * dz * dh;
		}
	}

	let a = 0;
	let b = 0;
	const determinant = sxx * szz - sxz * sxz;
	if (determinant > 1e-9 * sxx * szz && determinant > 0) {
		a = (sxh * szz - szh * sxz) / determinant;
		b = (szh * sxx - sxh * sxz) / determinant;
	} else if (sxx >= szz && sxx > 0) {
		a = sxh / sxx;
	} else if (szz > 0) {
		b = szh / szz;
	}

	return { a, b, c: meanH - a * meanX - b * meanZ };
}
