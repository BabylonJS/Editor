import type { ITerrainRgbaImage, ITerrainWeightMaps } from "./types";

/**
 * Logical weight maps (§4.10): layer l lives in maps[l >> 2], channel l & 3, texture order (row 0 = local -Z edge).
 * Every texel written by this module sums to exactly 255 over its layers and channels >= layerCount are 0.
 */

/** Two RGBA maps. */
const TERRAIN_MAX_LAYERS = 8;

/** Scratch of the quantizer (the module is synchronous, so one set is enough). */
const quantizeFractions = new Float64Array(TERRAIN_MAX_LAYERS);

function clampLayerCount(layerCount: number): number {
	const count = Math.floor(layerCount);
	if (!(count >= 1)) {
		return 1;
	}

	return Math.min(count, TERRAIN_MAX_LAYERS);
}

function validateSize(size: number): number {
	const value = Math.floor(size);
	if (!(value >= 1)) {
		throw new RangeError(`terrain: invalid weight map size ${size}`);
	}

	return value;
}

function validateLayerIndex(maps: ITerrainWeightMaps, layer: number, name: string): number {
	if (!Number.isInteger(layer) || layer < 0 || layer >= maps.layerCount) {
		throw new RangeError(`terrain: invalid ${name} ${layer} (layer count ${maps.layerCount})`);
	}

	return layer;
}

function createMapsObject(size: number, layerCount: number): ITerrainWeightMaps {
	const texels = size * size;
	return {
		size,
		layerCount,
		maps: [new Uint8Array(texels * 4), layerCount > 4 ? new Uint8Array(texels * 4) : null],
	};
}

/** Index of the largest of the first `count` values (ties → lowest index). */
function argmaxWeights(values: Float32Array, count: number): number {
	let best = 0;
	let bestValue = values[0];
	for (let i = 1; i < count; ++i) {
		if (values[i] > bestValue) {
			best = i;
			bestValue = values[i];
		}
	}

	return best;
}

/** Reads the 8 logical weights of a texel as floats (channels of a missing map are 0). */
function readTexelValues(maps: ITerrainWeightMaps, texel: number, out: Float32Array): void {
	const offset = texel * 4;
	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	out[0] = map0[offset];
	out[1] = map0[offset + 1];
	out[2] = map0[offset + 2];
	out[3] = map0[offset + 3];

	if (map1) {
		out[4] = map1[offset];
		out[5] = map1[offset + 1];
		out[6] = map1[offset + 2];
		out[7] = map1[offset + 3];
	} else {
		out[4] = 0;
		out[5] = 0;
		out[6] = 0;
		out[7] = 0;
	}
}

/** Quantizes values (layers >= layerCount are forced to 0, preferred = argmax) and writes the texel. */
function writeQuantizedTexel(maps: ITerrainWeightMaps, texel: number, values: Float32Array, bytes: Uint8Array): void {
	for (let i = maps.layerCount; i < TERRAIN_MAX_LAYERS; ++i) {
		values[i] = 0;
	}

	quantizeTerrainWeights(values, bytes, argmaxWeights(values, maps.layerCount));
	writeTerrainTexelWeights(maps, texel, bytes);
}

/** True when the texel values already satisfy the invariant (used layers sum to 255, unused channels are 0). */
function isTexelNormalized(maps: ITerrainWeightMaps, values: Float32Array): boolean {
	let sum = 0;
	for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
		if (i >= maps.layerCount) {
			if (values[i] !== 0) {
				return false;
			}
		} else {
			sum += values[i];
		}
	}

	return sum === 255;
}

/** The map holding `layer` (throws when the maps object is inconsistent with its layer count). */
function getLayerMap(maps: ITerrainWeightMaps, layer: number): Uint8Array {
	const map = maps.maps[layer >> 2];
	if (!map) {
		throw new RangeError(`terrain: weight map ${layer >> 2} is missing for layer ${layer}`);
	}

	return map;
}

/**
 * Remaps every texel of `maps` into new maps of `layerCount` layers: `remap(old, next)` fills the 8 new values from the 8 old ones,
 * then each texel is re-quantized (preferred = argmax). The source maps are not modified.
 */
function remapTerrainWeights(maps: ITerrainWeightMaps, layerCount: number, remap: (previous: Float32Array, next: Float32Array) => void): ITerrainWeightMaps {
	const result = createMapsObject(maps.size, layerCount);
	const texels = maps.size * maps.size;

	const previous = new Float32Array(TERRAIN_MAX_LAYERS);
	const next = new Float32Array(TERRAIN_MAX_LAYERS);
	const bytes = new Uint8Array(TERRAIN_MAX_LAYERS);

	for (let texel = 0; texel < texels; ++texel) {
		readTexelValues(maps, texel, previous);
		next.fill(0);
		remap(previous, next);
		writeQuantizedTexel(result, texel, next, bytes);
	}

	return result;
}

/** Bilinear sample of one channel of an RGBA image (image order) at fractional pixel coordinates, clamped to the image. */
function sampleRgbaChannel(image: ITerrainRgbaImage, px: number, py: number, channel: number): number {
	const maxX = image.width - 1;
	const maxY = image.height - 1;
	const x = px < 0 ? 0 : px > maxX ? maxX : px;
	const y = py < 0 ? 0 : py > maxY ? maxY : py;
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const x1 = x0 < maxX ? x0 + 1 : x0;
	const y1 = y0 < maxY ? y0 + 1 : y0;
	const fx = x - x0;
	const fy = y - y0;
	const data = image.data;
	const v00 = data[(y0 * image.width + x0) * 4 + channel];
	const v10 = data[(y0 * image.width + x1) * 4 + channel];
	const v01 = data[(y1 * image.width + x0) * 4 + channel];
	const v11 = data[(y1 * image.width + x1) * 4 + channel];
	const top = v00 + (v10 - v00) * fx;
	const bottom = v01 + (v11 - v01) * fx;
	return top + (bottom - top) * fy;
}

/**
 * New logical weight maps of size x size texels where every texel is 100 % `baseLayer` (default 0).
 * layerCount is clamped to 1..8; maps[1] is allocated only above 4 layers.
 */
export function createTerrainWeightMaps(size: number, layerCount: number, baseLayer?: number): ITerrainWeightMaps {
	const texelSize = validateSize(size);
	const count = clampLayerCount(layerCount);
	const result = createMapsObject(texelSize, count);

	const base = baseLayer !== undefined && Number.isInteger(baseLayer) && baseLayer >= 0 && baseLayer < count ? baseLayer : 0;
	const map = getLayerMap(result, base);
	const channel = base & 3;
	const length = texelSize * texelSize * 4;
	for (let offset = channel; offset < length; offset += 4) {
		map[offset] = 255;
	}

	return result;
}

/** 8 values. */
export function readTerrainTexelWeights(maps: ITerrainWeightMaps, texel: number, out: Uint8Array): void {
	const offset = texel * 4;
	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	out[0] = map0[offset];
	out[1] = map0[offset + 1];
	out[2] = map0[offset + 2];
	out[3] = map0[offset + 3];

	if (map1) {
		out[4] = map1[offset];
		out[5] = map1[offset + 1];
		out[6] = map1[offset + 2];
		out[7] = map1[offset + 3];
	} else {
		out[4] = 0;
		out[5] = 0;
		out[6] = 0;
		out[7] = 0;
	}
}

/** Writes the 8 weights of a texel (the channels of maps[1] only when it exists). */
export function writeTerrainTexelWeights(maps: ITerrainWeightMaps, texel: number, weights: Uint8Array): void {
	const offset = texel * 4;
	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	map0[offset] = weights[0];
	map0[offset + 1] = weights[1];
	map0[offset + 2] = weights[2];
	map0[offset + 3] = weights[3];

	if (map1) {
		map1[offset] = weights[4];
		map1[offset + 1] = weights[5];
		map1[offset + 2] = weights[6];
		map1[offset + 3] = weights[7];
	}
}

/**
 * values: 8 non-negative floats (not necessarily normalized); out: 8 bytes summing to 255 (largest remainder, ties → preferredLayer then lowest index).
 * All zero → preferredLayer = 255. Negative, NaN and infinite values count as 0; a layer whose value is 0 never receives a remainder unit.
 */
export function quantizeTerrainWeights(values: Float32Array, out: Uint8Array, preferredLayer: number): void {
	const preferred = preferredLayer >= 0 && preferredLayer < TERRAIN_MAX_LAYERS ? Math.floor(preferredLayer) : 0;

	let sum = 0;
	for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
		const value = values[i];
		if (value > 0 && value < Infinity) {
			sum += value;
		}
	}

	if (!(sum > 0) || sum === Infinity) {
		for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
			out[i] = 0;
		}
		out[preferred] = 255;
		return;
	}

	const scale = 255 / sum;
	let assigned = 0;
	for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
		const value = values[i];
		if (value > 0 && value < Infinity) {
			const scaled = value * scale;
			const quantized = Math.min(255, Math.floor(scaled));
			out[i] = quantized;
			quantizeFractions[i] = scaled - quantized;
			assigned += quantized;
		} else {
			out[i] = 0;
			quantizeFractions[i] = -1;
		}
	}

	let remainder = 255 - assigned;
	while (remainder > 0) {
		let best = -1;
		let bestFraction = -1;
		for (let i = 0; i < TERRAIN_MAX_LAYERS; ++i) {
			const fraction = quantizeFractions[i];
			if (fraction < 0) {
				continue;
			}

			if (fraction > bestFraction || (fraction === bestFraction && i === preferred)) {
				best = i;
				bestFraction = fraction;
			}
		}

		if (best < 0) {
			// Unreachable in exact arithmetic (the remainder never exceeds the number of fractional parts): keep Σ = 255 anyway,
			// on the largest quantized layer (a used layer; the sum is below 255 so it can't overflow).
			let largest = 0;
			for (let i = 1; i < TERRAIN_MAX_LAYERS; ++i) {
				if (out[i] > out[largest]) {
					largest = i;
				}
			}
			out[largest] += remainder;
			break;
		}

		++out[best];
		quantizeFractions[best] = -1;
		--remainder;
	}
}

/** Every texel becomes 100 % `layer`. */
export function fillTerrainLayer(maps: ITerrainWeightMaps, layer: number): void {
	validateLayerIndex(maps, layer, "layer");

	const map = getLayerMap(maps, layer);
	maps.maps[0].fill(0);
	maps.maps[1]?.fill(0);

	const channel = layer & 3;
	for (let offset = channel; offset < map.length; offset += 4) {
		map[offset] = 255;
	}
}

/** Re-quantizes every texel whose used layers don't sum to 255 or whose unused channels aren't 0 (preferred = argmax; all zero → layer 0). */
export function normalizeTerrainWeights(maps: ITerrainWeightMaps): void {
	const texels = maps.size * maps.size;
	const values = new Float32Array(TERRAIN_MAX_LAYERS);
	const bytes = new Uint8Array(TERRAIN_MAX_LAYERS);

	for (let texel = 0; texel < texels; ++texel) {
		readTexelValues(maps, texel, values);
		if (!isTexelNormalized(maps, values)) {
			writeQuantizedTexel(maps, texel, values, bytes);
		}
	}
}

/**
 * Inserts an empty layer at `index` (0..layerCount): layers >= index shift up (§4.10.6). Returns new maps objects (maps[1] created
 * when crossing 4 layers); the source maps are not modified. Throws when 8 layers already exist.
 */
export function insertTerrainLayer(maps: ITerrainWeightMaps, index: number): ITerrainWeightMaps {
	const count = maps.layerCount;
	if (count >= TERRAIN_MAX_LAYERS) {
		throw new RangeError(`terrain: can't insert a layer, ${TERRAIN_MAX_LAYERS} layers maximum`);
	}

	if (!Number.isInteger(index) || index < 0 || index > count) {
		throw new RangeError(`terrain: invalid layer insertion index ${index} (layer count ${count})`);
	}

	return remapTerrainWeights(maps, count + 1, (previous, next) => {
		for (let layer = 0; layer < count; ++layer) {
			next[layer < index ? layer : layer + 1] = previous[layer];
		}
	});
}

/**
 * Removes layer `index`: its weight is redistributed to the other layers proportionally to their weights (to the new layer 0 when they are
 * all 0), layers above shift down (§4.10.6). Returns new maps objects (maps[1] dropped at 4 layers or less); the source maps are not modified.
 * Throws for the last remaining layer.
 */
export function removeTerrainLayer(maps: ITerrainWeightMaps, index: number): ITerrainWeightMaps {
	const count = maps.layerCount;
	if (count <= 1) {
		throw new RangeError("terrain: can't remove the last layer");
	}

	validateLayerIndex(maps, index, "layer");

	return remapTerrainWeights(maps, count - 1, (previous, next) => {
		let others = 0;
		for (let layer = 0; layer < count; ++layer) {
			if (layer !== index) {
				const value = previous[layer];
				next[layer < index ? layer : layer - 1] = value;
				others += value;
			}
		}

		const freed = previous[index];
		if (freed <= 0) {
			return;
		}

		if (others > 0) {
			const scale = 1 + freed / others;
			for (let layer = 0; layer < count - 1; ++layer) {
				next[layer] *= scale;
			}
		} else {
			next[0] = freed;
		}
	});
}

/** Moves layer `from` to index `to` (array-move semantics, the layers between shift by one); channel permutation of every texel (§4.10.6). */
export function moveTerrainLayer(maps: ITerrainWeightMaps, from: number, to: number): ITerrainWeightMaps {
	const count = maps.layerCount;
	validateLayerIndex(maps, from, "source layer");
	validateLayerIndex(maps, to, "destination layer");

	const order: number[] = [];
	for (let layer = 0; layer < count; ++layer) {
		order.push(layer);
	}
	order.splice(from, 1);
	order.splice(to, 0, from);

	return remapTerrainWeights(maps, count, (previous, next) => {
		for (let layer = 0; layer < count; ++layer) {
			next[layer] = previous[order[layer]];
		}
	});
}

/**
 * Bilinear resampling of every layer to size x size texels, sampled at the destination texel centres (source (t + 0.5) N / N' - 0.5, clamped),
 * then re-quantized (§4.10.7). Returns new maps objects; the source maps are not modified.
 */
export function resampleTerrainWeightMaps(maps: ITerrainWeightMaps, size: number): ITerrainWeightMaps {
	const targetSize = validateSize(size);
	const sourceSize = maps.size;
	const count = maps.layerCount;
	const result = createMapsObject(targetSize, count);

	if (targetSize === sourceSize) {
		result.maps[0].set(maps.maps[0]);
		if (result.maps[1] && maps.maps[1]) {
			result.maps[1].set(maps.maps[1]);
		}
		return result;
	}

	const ratio = sourceSize / targetSize;
	const maxSource = sourceSize - 1;
	const values = new Float32Array(TERRAIN_MAX_LAYERS);
	const bytes = new Uint8Array(TERRAIN_MAX_LAYERS);

	for (let ty = 0; ty < targetSize; ++ty) {
		let sy = (ty + 0.5) * ratio - 0.5;
		sy = sy < 0 ? 0 : sy > maxSource ? maxSource : sy;
		const y0 = Math.floor(sy);
		const y1 = y0 < maxSource ? y0 + 1 : y0;
		const fy = sy - y0;

		for (let tx = 0; tx < targetSize; ++tx) {
			let sx = (tx + 0.5) * ratio - 0.5;
			sx = sx < 0 ? 0 : sx > maxSource ? maxSource : sx;
			const x0 = Math.floor(sx);
			const x1 = x0 < maxSource ? x0 + 1 : x0;
			const fx = sx - x0;

			const o00 = (y0 * sourceSize + x0) * 4;
			const o10 = (y0 * sourceSize + x1) * 4;
			const o01 = (y1 * sourceSize + x0) * 4;
			const o11 = (y1 * sourceSize + x1) * 4;

			for (let layer = 0; layer < TERRAIN_MAX_LAYERS; ++layer) {
				const map = layer < count ? maps.maps[layer >> 2] : null;
				if (!map) {
					values[layer] = 0;
					continue;
				}

				const channel = layer & 3;
				const top = map[o00 + channel] + (map[o10 + channel] - map[o00 + channel]) * fx;
				const bottom = map[o01 + channel] + (map[o11 + channel] - map[o01 + channel]) * fx;
				values[layer] = top + (bottom - top) * fy;
			}

			writeQuantizedTexel(result, ty * targetSize + tx, values, bytes);
		}
	}

	return result;
}

/** Mean of weight / 255 per layer over every texel (§4.10.9); layerCount entries. */
export function computeTerrainLayerCoverage(maps: ITerrainWeightMaps): number[] {
	const count = maps.layerCount;
	const texels = maps.size * maps.size;
	const sums = new Float64Array(TERRAIN_MAX_LAYERS);

	for (let mapIndex = 0; mapIndex < 2; ++mapIndex) {
		const map = maps.maps[mapIndex];
		if (!map || mapIndex * 4 >= count) {
			continue;
		}

		let s0 = 0;
		let s1 = 0;
		let s2 = 0;
		let s3 = 0;
		const length = texels * 4;
		for (let offset = 0; offset < length; offset += 4) {
			s0 += map[offset];
			s1 += map[offset + 1];
			s2 += map[offset + 2];
			s3 += map[offset + 3];
		}

		sums[mapIndex * 4] = s0;
		sums[mapIndex * 4 + 1] = s1;
		sums[mapIndex * 4 + 2] = s2;
		sums[mapIndex * 4 + 3] = s3;
	}

	const coverage: number[] = [];
	const divider = texels * 255;
	for (let layer = 0; layer < count; ++layer) {
		coverage.push(divider > 0 ? sums[layer] / divider : 0);
	}

	return coverage;
}

/**
 * Replaces every texel from 1 or 2 RGBA splat maps (image order, any size; §4.10.10). maps.layerCount must already be >= 4 x (number of splats used).
 * Splat k channel c is the weight of layer 4k + c; each texel samples both splats bilinearly at the same UV (column (tx + 0.5) w / N - 0.5,
 * row (N - ty - 0.5) h / N - 0.5, clamped); layers without a splat or beyond layerCount get 0; quantized with preferred = argmax (all zero → layer 0).
 */
export function setTerrainWeightsFromSplat(maps: ITerrainWeightMaps, splats: readonly [ITerrainRgbaImage, ITerrainRgbaImage | null]): void {
	const size = maps.size;
	const count = maps.layerCount;
	const sources: (ITerrainRgbaImage | null)[] = [splats[0], splats[1]];

	for (const splat of sources) {
		if (splat && (!(splat.width >= 1) || !(splat.height >= 1) || splat.data.length < splat.width * splat.height * 4)) {
			throw new RangeError("terrain: invalid splat map image");
		}
	}

	const values = new Float32Array(TERRAIN_MAX_LAYERS);
	const bytes = new Uint8Array(TERRAIN_MAX_LAYERS);

	for (let ty = 0; ty < size; ++ty) {
		for (let tx = 0; tx < size; ++tx) {
			values.fill(0);

			for (let k = 0; k < 2; ++k) {
				const splat = sources[k];
				if (!splat) {
					continue;
				}

				const px = ((tx + 0.5) * splat.width) / size - 0.5;
				const py = ((size - ty - 0.5) * splat.height) / size - 0.5;
				for (let channel = 0; channel < 4; ++channel) {
					const layer = k * 4 + channel;
					if (layer < count) {
						values[layer] = sampleRgbaChannel(splat, px, py, channel);
					}
				}
			}

			quantizeTerrainWeights(values, bytes, argmaxWeights(values, count));
			writeTerrainTexelWeights(maps, ty * size + tx, bytes);
		}
	}
}

/**
 * 8 weights 0..1 (sum 1) of the texel nearest to texture coordinates (u, v); unused layers 0 (§4.10.11): tx = clamp(floor(u N), 0, N - 1),
 * ty = clamp(floor(v N), 0, N - 1). A texel whose used layers sum to 0 reports layer 0 = 1.
 */
export function sampleTerrainTexelWeights(maps: ITerrainWeightMaps, u: number, v: number, out: Float32Array): void {
	const size = maps.size;
	const count = maps.layerCount;
	const maxTexel = size - 1;

	let tx = Math.floor((Number.isFinite(u) ? u : 0) * size);
	let ty = Math.floor((Number.isFinite(v) ? v : 0) * size);
	tx = tx < 0 ? 0 : tx > maxTexel ? maxTexel : tx;
	ty = ty < 0 ? 0 : ty > maxTexel ? maxTexel : ty;

	readTexelValues(maps, ty * size + tx, out);

	let sum = 0;
	for (let layer = 0; layer < TERRAIN_MAX_LAYERS; ++layer) {
		if (layer < count) {
			sum += out[layer];
		} else {
			out[layer] = 0;
		}
	}

	if (sum > 0) {
		const scale = 1 / sum;
		for (let layer = 0; layer < count; ++layer) {
			out[layer] *= scale;
		}
	} else {
		out[0] = 1;
	}
}
