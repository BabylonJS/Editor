import { createTerrainNoise, sampleTerrainFractal, type ITerrainNoise } from "../noise";
import type { ITerrainDabWeights, ITerrainRect, ITerrainResolvedAutoPaintRule, ITerrainWeightMaps } from "../types";
import { quantizeTerrainWeights } from "../weights";

/** Surface under a texel centre (§4.10.5): world height (cm), slope (degrees) and local x, z (§4.1). */
export interface ITerrainTexelSurface {
	heightWorld: number;
	slopeDegrees: number;
	x: number;
	z: number;
}

/** Two RGBA maps. */
const MAX_LAYERS = 8;

/** The "fbm3" of §4.10.5: 3 octaves of fBm. */
const RULE_NOISE_FRACTAL = { type: "fbm", octaves: 3, persistence: 0.5, lacunarity: 2 } as const;

/** Per-texel scratch (the kernels are synchronous, so one set is enough). */
const ruleWeights = new Float32Array(MAX_LAYERS);
const texelWeights = new Float32Array(MAX_LAYERS);
const quantizedWeights = new Uint8Array(MAX_LAYERS);

interface ITerrainOrderedRule {
	rule: ITerrainResolvedAutoPaintRule;
	noise: ITerrainNoise | null;
}

/** GLSL smoothstep; a step when e0 = e1 (§4). */
function smoothstep(edge0: number, edge1: number, value: number): number {
	if (edge0 === edge1) {
		return value < edge0 ? 0 : 1;
	}

	let t = (value - edge0) / (edge1 - edge0);
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	return t * t * (3 - 2 * t);
}

/** band(value, {min, max, feather}) = smoothstep(min − feather, min, value) × (1 − smoothstep(max, max + feather, value)). */
function band(value: number, min: number, max: number, feather: number): number {
	const soft = feather > 0 ? feather : 0;
	return smoothstep(min - soft, min, value) * (1 - smoothstep(max, max + soft, value));
}

/** c_i of a rule at a texel (§4.10.5). */
function evaluateRuleCoverage(rule: ITerrainResolvedAutoPaintRule, surface: ITerrainTexelSurface, noise: ITerrainNoise | null | undefined): number {
	let coverage = rule.opacity;

	if (rule.height) {
		coverage *= band(surface.heightWorld, rule.height.minWorld, rule.height.maxWorld, rule.height.featherWorld);
	}

	if (rule.slope) {
		coverage *= band(surface.slopeDegrees, rule.slope.minDegrees, rule.slope.maxDegrees, rule.slope.featherDegrees);
	}

	if (rule.noise && noise && coverage > 0) {
		const inverseScale = 1 / Math.max(rule.noise.scale, 1e-6);
		const value = 1 + rule.noise.amount * sampleTerrainFractal(noise, surface.x * inverseScale, surface.z * inverseScale, RULE_NOISE_FRACTAL);
		coverage *= value < 0 ? 0 : value > 1 ? 1 : value;
	}

	return coverage > 0 ? (coverage < 1 ? coverage : 1) : 0;
}

/** out = mix(out, onehot(layer), c). */
function mixOneHot(out: Float32Array, layer: number, coverage: number): void {
	const keep = 1 - coverage;
	for (let i = 0; i < MAX_LAYERS; ++i) {
		out[i] *= keep;
	}
	out[layer] += coverage;
}

/** Evaluates rules already sorted by layer (enabled, layerIndex < layerCount). */
function evaluateOrderedRules(rules: readonly ITerrainOrderedRule[], surface: ITerrainTexelSurface, out: Float32Array): void {
	out.fill(0);
	out[0] = 1;

	for (let i = 0; i < rules.length; ++i) {
		const coverage = evaluateRuleCoverage(rules[i].rule, surface, rules[i].noise);
		if (coverage > 0) {
			mixOneHot(out, rules[i].rule.layerIndex, coverage);
		}
	}
}

function argmax(values: Float32Array, count: number): number {
	let best = 0;
	for (let i = 1; i < count; ++i) {
		if (values[i] > values[best]) {
			best = i;
		}
	}

	return best;
}

/**
 * Writes 8 floats summing to 1 (§4.10.5): out = onehot(0), then for each layer i from 0 to layerCount − 1 with an enabled rule,
 * out = mix(out, onehot(i), c_i) with c_i = clamp01(opacity × band(Y, height) × band(slope, slope) × (noise ? clamp01(1 + amount × fbm3(x / scale, z / scale)) : 1)).
 * `noises[k]` is the noise of `rules[k]` (createTerrainNoise(rules[k].noise.seed)); entries of rules without noise are ignored.
 */
export function evaluateTerrainAutoPaint(
	rules: readonly ITerrainResolvedAutoPaintRule[],
	layerCount: number,
	surface: ITerrainTexelSurface,
	noises: readonly ITerrainNoise[],
	out: Float32Array
): void {
	out.fill(0);
	out[0] = 1;

	const count = Math.min(Math.max(0, Math.floor(layerCount)), MAX_LAYERS);
	for (let layer = 0; layer < count; ++layer) {
		for (let k = 0; k < rules.length; ++k) {
			const rule = rules[k];
			if (rule.layerIndex !== layer || !rule.enabled) {
				continue;
			}

			const coverage = evaluateRuleCoverage(rule, surface, noises[k]);
			if (coverage > 0) {
				mixOneHot(out, layer, coverage);
			}
		}
	}
}

/**
 * Moves the weights towards the rules result (§4.10.5). dabWeights null = whole map with amount 1 (replace: new = rules result).
 * With dab weights, new = mix(current, rules, min(1, 4 × amount × w)): a brush dab passes amount = strength' × amountScale; an area
 * operation passes its disc weights a = 1 − smoothstep(0.9 R, R, d) with amount = 0.25 (mix by exactly a), and a sliced whole-map operation
 * passes row bands of weight 1 with amount 0.25. Texels with w = 0 are untouched. Quantized with preferred = argmax. Returns the rect written.
 */
export function applyTerrainAutoPaint(
	maps: ITerrainWeightMaps,
	dabWeights: ITerrainDabWeights | null,
	rules: readonly ITerrainResolvedAutoPaintRule[],
	surfaceAt: (tx: number, ty: number) => ITerrainTexelSurface,
	amount: number
): ITerrainRect | null {
	const size = maps.size;
	const layerCount = Math.min(maps.layerCount, MAX_LAYERS);

	const ordered: ITerrainOrderedRule[] = rules
		.filter((rule) => rule.enabled && Number.isInteger(rule.layerIndex) && rule.layerIndex >= 0 && rule.layerIndex < layerCount)
		.map((rule) => ({ rule, noise: rule.noise ? createTerrainNoise(rule.noise.seed) : null }))
		.sort((a, b) => a.rule.layerIndex - b.rule.layerIndex);

	let x0 = 0;
	let y0 = 0;
	let x1 = size - 1;
	let y1 = size - 1;
	if (dabWeights) {
		if (!(amount > 0) || !Number.isFinite(amount)) {
			return null;
		}

		x0 = Math.max(x0, dabWeights.rect.x0);
		y0 = Math.max(y0, dabWeights.rect.y0);
		x1 = Math.min(x1, dabWeights.rect.x1);
		y1 = Math.min(y1, dabWeights.rect.y1);
	}

	if (x1 < x0 || y1 < y0) {
		return null;
	}

	const map0 = maps.maps[0];
	const map1 = maps.maps[1];

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let ty = y0; ty <= y1; ++ty) {
		const weightRow = dabWeights ? (ty - dabWeights.rect.y0) * dabWeights.stride - dabWeights.rect.x0 : 0;
		let first = -1;
		let last = -1;

		for (let tx = x0; tx <= x1; ++tx) {
			let factor = 1;
			if (dabWeights) {
				const w = dabWeights.weights[weightRow + tx];
				if (!(w > 0)) {
					continue;
				}
				factor = Math.min(1, 4 * amount * w);
			}

			evaluateOrderedRules(ordered, surfaceAt(tx, ty), ruleWeights);

			const offset = (ty * size + tx) * 4;
			for (let l = 0; l < MAX_LAYERS; ++l) {
				if (l >= layerCount) {
					texelWeights[l] = 0;
					continue;
				}

				const map = l < 4 ? map0 : map1;
				const current = map ? map[offset + (l & 3)] / 255 : 0;
				texelWeights[l] = current + (ruleWeights[l] - current) * factor;
			}

			quantizeTerrainWeights(texelWeights, quantizedWeights, argmax(texelWeights, layerCount));

			map0[offset] = quantizedWeights[0];
			map0[offset + 1] = quantizedWeights[1];
			map0[offset + 2] = quantizedWeights[2];
			map0[offset + 3] = quantizedWeights[3];
			if (map1) {
				map1[offset] = quantizedWeights[4];
				map1[offset + 1] = quantizedWeights[5];
				map1[offset + 2] = quantizedWeights[6];
				map1[offset + 3] = quantizedWeights[7];
			}

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
