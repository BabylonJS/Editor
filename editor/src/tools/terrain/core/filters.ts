import type { ITerrainFilterBand, ITerrainFilterSettings, ITerrainGrid, ITerrainSurfaceSampler, ITerrainWeightMaps } from "./types";

export interface ITerrainFilterEvaluator {
	/** Multiplier 0..1 at a local point. */
	evaluate(x: number, z: number): number;
}

/** Half width of the smooth step of the layer filter around its threshold (§4.13). */
const TERRAIN_LAYER_FILTER_SOFTNESS = 0.05;

interface ITerrainResolvedBand {
	min: number;
	max: number;
	feather: number;
	invert: boolean;
}

/**
 * Filters of §4.13 (height, slope and layer bands), shared by the paint AND sculpt tools. The multiplier is the product over the enabled
 * filters of band (or 1 - band when inverted):
 * - height: band(surface.heightWorldAt(x, z), height band) (world cm);
 * - slope: band(surface.slopeDegreesAt(x, z), slope band) (degrees);
 * - layer: smoothstep(threshold - 0.05, threshold + 0.05, w / 255) with w the weight of filterLayerIndex at the texel nearest to (x, z).
 *   Ignored without weight maps (terrain without terrain material) or without a valid layer index.
 * band(v, { min, max, feather }) = smoothstep(min - feather, min, v) × (1 - smoothstep(max, max + feather, v)).
 * null when no filter is enabled (or none can apply).
 */
export function createTerrainFilterEvaluator(
	filters: ITerrainFilterSettings,
	surface: ITerrainSurfaceSampler,
	weights: ITerrainWeightMaps | null,
	grid: ITerrainGrid,
	filterLayerIndex: number
): ITerrainFilterEvaluator | null {
	const heightBand = filters.height.enabled ? resolveTerrainBand(filters.height) : null;
	const slopeBand = filters.slope.enabled ? resolveTerrainBand(filters.slope) : null;
	const layer = filters.layer.enabled ? resolveTerrainLayerFilter(weights, filterLayerIndex, filters.layer.threshold, filters.layer.invert) : null;

	if (!heightBand && !slopeBand && !layer) {
		return null;
	}

	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;
	const invWidth = grid.width > 0 ? 1 / grid.width : 0;
	const invHeight = grid.height > 0 ? 1 / grid.height : 0;

	return {
		evaluate: (x: number, z: number): number => {
			let multiplier = 1;

			// Cheapest first (a texel read), then the surface samplers; stop as soon as the product is 0.
			if (layer) {
				const size = layer.size;
				const tx = Math.min(size - 1, Math.max(0, Math.floor((x + halfWidth) * invWidth * size)));
				const ty = Math.min(size - 1, Math.max(0, Math.floor((z + halfHeight) * invHeight * size)));
				const value = layer.map[(ty * size + tx) * 4 + layer.channel] / 255;
				const band = smoothstep(layer.threshold - TERRAIN_LAYER_FILTER_SOFTNESS, layer.threshold + TERRAIN_LAYER_FILTER_SOFTNESS, value);
				multiplier *= layer.invert ? 1 - band : band;
				if (!(multiplier > 0)) {
					return 0;
				}
			}

			if (heightBand) {
				multiplier *= evaluateTerrainBand(heightBand, surface.heightWorldAt(x, z));
				if (!(multiplier > 0)) {
					return 0;
				}
			}

			if (slopeBand) {
				multiplier *= evaluateTerrainBand(slopeBand, surface.slopeDegreesAt(x, z));
				if (!(multiplier > 0)) {
					return 0;
				}
			}

			return Math.min(1, multiplier);
		},
	};
}

function resolveTerrainBand(band: ITerrainFilterBand): ITerrainResolvedBand {
	return {
		min: band.min,
		max: band.max,
		feather: band.feather > 0 ? band.feather : 0,
		invert: band.invert,
	};
}

function resolveTerrainLayerFilter(
	weights: ITerrainWeightMaps | null,
	layerIndex: number,
	threshold: number,
	invert: boolean
): { map: Uint8Array; size: number; channel: number; threshold: number; invert: boolean } | null {
	if (!weights || !(layerIndex >= 0) || layerIndex >= weights.layerCount || weights.size < 1) {
		return null;
	}

	const map = weights.maps[layerIndex >> 2];
	if (!map || map.length < weights.size * weights.size * 4) {
		return null;
	}

	return {
		map,
		size: weights.size,
		channel: layerIndex & 3,
		threshold: Number.isFinite(threshold) ? threshold : 0,
		invert,
	};
}

/** band (or 1 - band when inverted) of §4.13; a non-finite value (no surface) gives 0. */
function evaluateTerrainBand(band: ITerrainResolvedBand, value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	const inside = smoothstep(band.min - band.feather, band.min, value) * (1 - smoothstep(band.max, band.max + band.feather, value));
	return band.invert ? 1 - inside : inside;
}

/** GLSL smoothstep; a step (x < e0 ? 0 : 1) when e0 === e1. */
function smoothstep(e0: number, e1: number, x: number): number {
	if (e0 === e1) {
		return x < e0 ? 0 : 1;
	}

	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
}
