import type { ITerrainDabWeights, ITerrainRect, ITerrainWeightMaps } from "../types";

import type { ITerrainScratch } from "./sculpt";

/** Inputs of one paint / erase dab (§4.10.2). Texel space, texture order. */
export interface ITerrainPaintContext {
	maps: ITerrainWeightMaps;
	/** Dab weights in texel space. */
	dabWeights: ITerrainDabWeights;
	/** strength x amountScale. */
	flow: number;
	/** 0..1: maximum coverage the stroke can reach. */
	opacity: number;
	/** Erase the layer (Shift, X) instead of painting it. */
	erase: boolean;
	/** Painted layer (< maps.layerCount). */
	layer: number;
	/** Layer receiving erased weight when every other layer is 0 at the texel: 0, or 1 when `layer` is 0 (ignored when >= layerCount or = layer). */
	fallbackLayer: number;
	/** Stroke-start weight 0..255 of `layer` at `texel` (ty * size + tx), read from the journal. */
	before: (texel: number, layer: number) => number;
	/**
	 * Per-stroke coverage, keyed by 64x64 tile index, Float32Array(64 * 64). Tile index = (ty >> 6) * ceil(size / 64) + (tx >> 6), element
	 * (ty & 63) * 64 + (tx & 63). Starts empty; the kernel creates the tiles it needs (0 = stroke start).
	 */
	coverage: Map<number, Float32Array>;
}

/** Two RGBA maps. */
const MAX_LAYERS = 8;

/** Coverage tiles (§4.10.2). */
const COVERAGE_TILE_SHIFT = 6;
const COVERAGE_TILE_SIZE = 1 << COVERAGE_TILE_SHIFT;
const COVERAGE_TILE_MASK = COVERAGE_TILE_SIZE - 1;

/** Scratch slots of the blend kernel (kernels use slots >= 16, see ITerrainScratch). */
const BLEND_SOURCE_SLOT = 20;
const BLEND_ROWS_SLOT = 21;
const BLEND_AVERAGE_SLOT = 22;

/**
 * Per-texel scratch of the kernels (the kernels are synchronous, so one set is enough): the ACTIVE layers of the texel being written
 * (increasing layer order) and their values; every other layer of the texel is 0.
 */
const activeLayers = new Int32Array(MAX_LAYERS);
const activeValues = new Float64Array(MAX_LAYERS);
const activeQuantized = new Int32Array(MAX_LAYERS);
const activeFractions = new Float64Array(MAX_LAYERS);

/** Placeholder coverage tile before the first texel of a row loads its tile. */
const NO_COVERAGE_TILE = new Float32Array(0);

/** Column accumulators of the blend's vertical running sums (float64). */
let blendAccumulator = new Float64Array(0);

/** The dab rect clamped to the size x size texels, null when empty. */
function clampTexelRect(rect: ITerrainRect, size: number): ITerrainRect | null {
	const x0 = Math.max(rect.x0, 0);
	const y0 = Math.max(rect.y0, 0);
	const x1 = Math.min(rect.x1, size - 1);
	const y1 = Math.min(rect.y1, size - 1);
	return x1 < x0 || y1 < y0 ? null : { x0, y0, x1, y1 };
}

/**
 * Quantizes the `count` active layers (activeLayers / activeValues, values of any positive scale; the other layers are 0) and writes the
 * texel at `offset` of both maps: the largest remainder of quantizeTerrainWeights (§4.10.1: Σ = 255, ties → preferred then the lowest
 * index, all zero → preferred = 255), in O(count) instead of O(8) (a texel usually carries 2 or 3 layers).
 */
function writeQuantizedTexel(map0: Uint8Array, map1: Uint8Array | null, offset: number, count: number, preferred: number): void {
	map0[offset] = 0;
	map0[offset + 1] = 0;
	map0[offset + 2] = 0;
	map0[offset + 3] = 0;
	if (map1) {
		map1[offset] = 0;
		map1[offset + 1] = 0;
		map1[offset + 2] = 0;
		map1[offset + 3] = 0;
	}

	let sum = 0;
	for (let c = 0; c < count; ++c) {
		const value = activeValues[c];
		if (value > 0) {
			sum += value;
		}
	}

	if (!(sum > 0) || sum === Infinity) {
		activeLayers[0] = preferred;
		activeQuantized[0] = 255;
		count = 1;
	} else {
		const scale = 255 / sum;
		let assigned = 0;
		for (let c = 0; c < count; ++c) {
			const value = activeValues[c];
			if (value > 0) {
				const scaled = value * scale;
				const quantized = Math.floor(scaled);
				activeQuantized[c] = quantized;
				activeFractions[c] = scaled - quantized;
				assigned += quantized;
			} else {
				activeQuantized[c] = 0;
				activeFractions[c] = -1;
			}
		}

		for (let remainder = 255 - assigned; remainder > 0; --remainder) {
			let best = -1;
			let bestFraction = -1;
			for (let c = 0; c < count; ++c) {
				const fraction = activeFractions[c];
				if (fraction >= 0 && (fraction > bestFraction || (fraction === bestFraction && activeLayers[c] === preferred))) {
					best = c;
					bestFraction = fraction;
				}
			}

			if (best < 0) {
				// Unreachable in exact arithmetic (see quantizeTerrainWeights): keep Σ = 255 on the largest layer.
				let largest = 0;
				for (let c = 1; c < count; ++c) {
					if (activeQuantized[c] > activeQuantized[largest]) {
						largest = c;
					}
				}
				activeQuantized[largest] += remainder;
				break;
			}

			++activeQuantized[best];
			activeFractions[best] = -1;
		}
	}

	for (let c = 0; c < count; ++c) {
		const layer = activeLayers[c];
		if (layer < 4) {
			map0[offset + layer] = activeQuantized[c];
		} else if (map1) {
			map1[offset + layer - 4] = activeQuantized[c];
		}
	}
}

/**
 * Paint / erase with the flow + opacity model (§4.10.2), computed from the stroke-start weights `before` so that repeated passes in one
 * stroke never exceed the opacity: per texel with dab weight w > 0, f = clamp01(2 × flow × w), m = min(opacity, m + (1 − m) f) (m = stroke
 * coverage). Paint: new_L = base_L + (1 − base_L) m, others base_i (1 − m). Erase: new_L = base_L (1 − m), the freed weight goes to the
 * other layers proportionally to their base weights (to fallbackLayer when they are all 0). Quantized with preferred = L (paint) or fallback (erase).
 */
export function applyTerrainPaint(context: ITerrainPaintContext): ITerrainRect | null {
	const { maps, dabWeights, erase, layer, before, coverage } = context;
	const size = maps.size;
	const layerCount = Math.min(maps.layerCount, MAX_LAYERS);
	const bounds = clampTexelRect(dabWeights.rect, size);
	const flow = context.flow > 0 && context.flow < Infinity ? context.flow : 0;
	const opacity = context.opacity > 0 ? Math.min(1, context.opacity) : 0;
	if (!bounds || !(flow > 0) || !(opacity > 0) || !Number.isInteger(layer) || layer < 0 || layer >= layerCount) {
		return null;
	}

	const fallback =
		Number.isInteger(context.fallbackLayer) && context.fallbackLayer >= 0 && context.fallbackLayer < layerCount && context.fallbackLayer !== layer ? context.fallbackLayer : -1;
	const preferred = erase && fallback >= 0 ? fallback : layer;
	const tilesPerRow = (size + COVERAGE_TILE_MASK) >> COVERAGE_TILE_SHIFT;
	const { weights, stride, rect } = dabWeights;
	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let ty = bounds.y0; ty <= bounds.y1; ++ty) {
		const weightRow = (ty - rect.y0) * stride - rect.x0;
		const tileRow = (ty >> COVERAGE_TILE_SHIFT) * tilesPerRow;
		const coverageRow = (ty & COVERAGE_TILE_MASK) << COVERAGE_TILE_SHIFT;
		let tileIndex = -1;
		let tile: Float32Array = NO_COVERAGE_TILE;
		let first = -1;
		let last = -1;

		for (let tx = bounds.x0; tx <= bounds.x1; ++tx) {
			const w = weights[weightRow + tx];
			if (!(w > 0)) {
				continue;
			}

			const index = tileRow + (tx >> COVERAGE_TILE_SHIFT);
			if (index !== tileIndex) {
				tileIndex = index;
				let existing = coverage.get(index);
				if (!existing) {
					existing = new Float32Array(COVERAGE_TILE_SIZE * COVERAGE_TILE_SIZE);
					coverage.set(index, existing);
				}
				tile = existing;
			}

			const f = 2 * flow * w;
			const coverageIndex = coverageRow + (tx & COVERAGE_TILE_MASK);
			const previous = tile[coverageIndex];
			let m = previous + (1 - previous) * (f < 1 ? f : 1);
			m = m < opacity ? m : opacity;
			tile[coverageIndex] = m;

			// Stroke-start weights (bytes; the model is scale-free): the painted layer and the non-zero others, in layer order.
			const texel = ty * size + tx;
			let count = 0;
			let painted = 0;
			let base = 0;
			let others = 0;
			for (let l = 0; l < layerCount; ++l) {
				const value = before(texel, l);
				if (l === layer) {
					painted = count;
					base = value;
				} else if (value > 0) {
					others += value;
				} else {
					continue;
				}

				activeLayers[count] = l;
				activeValues[count] = value;
				++count;
			}

			if (!erase) {
				const keep = 1 - m;
				for (let c = 0; c < count; ++c) {
					activeValues[c] *= keep;
				}
				activeValues[painted] = base + (255 - base) * m;
			} else if (others > 0) {
				const kept = base * (1 - m);
				const scale = 1 + (base - kept) / others;
				for (let c = 0; c < count; ++c) {
					activeValues[c] *= scale;
				}
				activeValues[painted] = kept;
			} else if (fallback >= 0) {
				// Only the erased layer: the freed weight goes to the fallback layer.
				const kept = base * (1 - m);
				const low = fallback < layer;
				activeLayers[0] = low ? fallback : layer;
				activeValues[0] = low ? base - kept : kept;
				activeLayers[1] = low ? layer : fallback;
				activeValues[1] = low ? kept : base - kept;
				count = 2;
			} else {
				activeValues[painted] = base * (1 - m);
			}

			writeQuantizedTexel(map0, map1, texel * 4, count, preferred);

			if (first < 0) {
				first = tx;
			}
			last = tx;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, ty);
			maxY = ty;
		}
	}

	return maxX < minX ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

/**
 * Blend (§4.10.3): box average over (2k + 1)² texels (k = kernelTexels 1..8, edge-clamped, computed from a scratch copy of rect ⊕ k) of every
 * layer; new = mix(current, average, min(1, 4 × amount × w)) with amount = strength' × amountScale; quantized with preferred = argmax.
 * Layers that are 0 over the whole rect ⊕ k stay 0 and are skipped.
 */
export function applyTerrainBlend(maps: ITerrainWeightMaps, dabWeights: ITerrainDabWeights, amount: number, kernelTexels: number, scratch: ITerrainScratch): ITerrainRect | null {
	const size = maps.size;
	const layerCount = Math.min(maps.layerCount, MAX_LAYERS);
	const bounds = clampTexelRect(dabWeights.rect, size);
	if (!bounds || !(amount > 0) || !Number.isFinite(amount)) {
		return null;
	}

	const kernel = Math.min(8, Math.max(1, Math.round(Number.isFinite(kernelTexels) ? kernelTexels : 2)));
	const regionX0 = Math.max(0, bounds.x0 - kernel);
	const regionY0 = Math.max(0, bounds.y0 - kernel);
	const regionX1 = Math.min(size - 1, bounds.x1 + kernel);
	const regionY1 = Math.min(size - 1, bounds.y1 + kernel);
	const regionWidth = regionX1 - regionX0 + 1;
	const regionHeight = regionY1 - regionY0 + 1;
	const boundsWidth = bounds.x1 - bounds.x0 + 1;
	const boundsHeight = bounds.y1 - bounds.y0 + 1;
	const boundsArea = boundsWidth * boundsHeight;

	const source = scratch.floats(regionWidth * regionHeight, BLEND_SOURCE_SLOT);
	const rows = scratch.floats(boundsWidth * regionHeight, BLEND_ROWS_SLOT);
	const averages = scratch.floats(boundsArea * layerCount, BLEND_AVERAGE_SLOT);
	const divider = 1 / ((2 * kernel + 1) * (2 * kernel + 1));
	const lastColumn = regionWidth - 1;
	const lastRow = regionHeight - 1;
	const firstColumn = bounds.x0 - regionX0;
	const firstRow = bounds.y0 - regionY0;

	if (blendAccumulator.length < boundsWidth) {
		blendAccumulator = new Float64Array(Math.max(boundsWidth, blendAccumulator.length * 2));
	}
	const accumulator = blendAccumulator;

	// Box averages of the layers present in the region, one plane per present layer.
	const presentLayers: number[] = [];
	for (let l = 0; l < layerCount; ++l) {
		const map = maps.maps[l >> 2];
		if (!map) {
			continue;
		}

		const channel = l & 3;
		let maximum = 0;
		for (let y = regionY0; y <= regionY1; ++y) {
			const sourceRow = (y - regionY0) * regionWidth - regionX0;
			const mapRow = y * size;
			for (let x = regionX0; x <= regionX1; ++x) {
				const value = map[(mapRow + x) * 4 + channel];
				source[sourceRow + x] = value;
				if (value > maximum) {
					maximum = value;
				}
			}
		}

		if (maximum === 0) {
			continue;
		}

		const plane = presentLayers.length * boundsArea;
		presentLayers.push(l);

		// Horizontal running sums for the bounds' columns (edge-clamped inside the region, which contains every window clamped to the map).
		for (let y = 0; y < regionHeight; ++y) {
			const sourceRow = y * regionWidth;
			const rowsRow = y * boundsWidth;

			let sum = 0;
			for (let d = -kernel; d <= kernel; ++d) {
				const column = firstColumn + d;
				sum += source[sourceRow + (column < 0 ? 0 : column > lastColumn ? lastColumn : column)];
			}

			for (let i = 0; i < boundsWidth; ++i) {
				rows[rowsRow + i] = sum;

				const added = firstColumn + i + kernel + 1;
				const removed = firstColumn + i - kernel;
				sum += source[sourceRow + (added > lastColumn ? lastColumn : added)] - source[sourceRow + (removed < 0 ? 0 : removed)];
			}
		}

		// Vertical running sums of the horizontal sums for the bounds' rows (one accumulator per column).
		accumulator.fill(0, 0, boundsWidth);
		for (let d = -kernel; d <= kernel; ++d) {
			const row = firstRow + d;
			const rowsRow = (row < 0 ? 0 : row > lastRow ? lastRow : row) * boundsWidth;
			for (let i = 0; i < boundsWidth; ++i) {
				accumulator[i] += rows[rowsRow + i];
			}
		}

		for (let j = 0; j < boundsHeight; ++j) {
			const added = firstRow + j + kernel + 1;
			const removed = firstRow + j - kernel;
			const addedRow = (added > lastRow ? lastRow : added) * boundsWidth;
			const removedRow = (removed < 0 ? 0 : removed) * boundsWidth;
			const output = plane + j * boundsWidth;

			for (let i = 0; i < boundsWidth; ++i) {
				averages[output + i] = accumulator[i] * divider;
				accumulator[i] += rows[addedRow + i] - rows[removedRow + i];
			}
		}
	}

	const presentCount = presentLayers.length;
	if (!presentCount) {
		return null;
	}

	const { weights, stride, rect } = dabWeights;
	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let ty = bounds.y0; ty <= bounds.y1; ++ty) {
		const weightRow = (ty - rect.y0) * stride - rect.x0;
		const averageRow = (ty - bounds.y0) * boundsWidth - bounds.x0;
		let first = -1;
		let last = -1;

		for (let tx = bounds.x0; tx <= bounds.x1; ++tx) {
			const w = weights[weightRow + tx];
			if (!(w > 0)) {
				continue;
			}

			const factor = Math.min(1, 4 * amount * w);
			const offset = (ty * size + tx) * 4;
			const averageIndex = averageRow + tx;

			// Preferred layer = argmax of the new values (ties → lowest index).
			let count = 0;
			let preferred = 0;
			let largest = 0;
			for (let p = 0; p < presentCount; ++p) {
				const l = presentLayers[p];
				const current = l < 4 ? map0[offset + l] : map1 ? map1[offset + l - 4] : 0;
				const value = current + (averages[p * boundsArea + averageIndex] - current) * factor;
				if (value > 0) {
					activeLayers[count] = l;
					activeValues[count] = value;
					++count;
					if (value > largest) {
						largest = value;
						preferred = l;
					}
				}
			}

			writeQuantizedTexel(map0, map1, offset, count, preferred);

			if (first < 0) {
				first = tx;
			}
			last = tx;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, ty);
			maxY = ty;
		}
	}

	return maxX < minX ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}

/**
 * Replace (§4.10.4): where w_from >= threshold × 255, moves min(1, 4 × amount × w) × w_from from `fromLayer` to `toLayer` (amount = strength' ×
 * amountScale; the caller swaps the layers for an inverted stroke); quantized with preferred = toLayer.
 */
export function applyTerrainReplace(
	maps: ITerrainWeightMaps,
	dabWeights: ITerrainDabWeights,
	fromLayer: number,
	toLayer: number,
	amount: number,
	threshold: number
): ITerrainRect | null {
	const size = maps.size;
	const layerCount = Math.min(maps.layerCount, MAX_LAYERS);
	const bounds = clampTexelRect(dabWeights.rect, size);
	const valid = (layer: number): boolean => Number.isInteger(layer) && layer >= 0 && layer < layerCount;
	if (!bounds || !(amount > 0) || !Number.isFinite(amount) || !valid(fromLayer) || !valid(toLayer) || fromLayer === toLayer) {
		return null;
	}

	const map0 = maps.maps[0];
	const map1 = maps.maps[1];
	const fromMap = fromLayer < 4 ? map0 : map1;
	if (!fromMap || (toLayer >= 4 && !map1)) {
		return null;
	}

	const minimum = (Number.isFinite(threshold) ? Math.min(1, Math.max(0, threshold)) : 0) * 255;
	const fromChannel = fromLayer & 3;
	const firstMapLayers = Math.min(layerCount, 4);
	const { weights, stride, rect } = dabWeights;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let ty = bounds.y0; ty <= bounds.y1; ++ty) {
		const weightRow = (ty - rect.y0) * stride - rect.x0;
		let first = -1;
		let last = -1;

		for (let tx = bounds.x0; tx <= bounds.x1; ++tx) {
			const w = weights[weightRow + tx];
			if (!(w > 0)) {
				continue;
			}

			const offset = (ty * size + tx) * 4;
			const from = fromMap[offset + fromChannel];
			if (from === 0 || from < minimum) {
				continue;
			}

			// Current weights of the non-zero layers (and the destination), in layer order.
			const moved = Math.min(1, 4 * amount * w) * from;
			let count = 0;
			for (let l = 0; l < layerCount; ++l) {
				let value = l < firstMapLayers ? map0[offset + l] : map1 ? map1[offset + l - 4] : 0;
				if (l === fromLayer) {
					value -= moved;
				} else if (l === toLayer) {
					value += moved;
				}

				if (value > 0) {
					activeLayers[count] = l;
					activeValues[count] = value;
					++count;
				}
			}

			writeQuantizedTexel(map0, map1, offset, count, toLayer);

			if (first < 0) {
				first = tx;
			}
			last = tx;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, ty);
			maxY = ty;
		}
	}

	return maxX < minX ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}
