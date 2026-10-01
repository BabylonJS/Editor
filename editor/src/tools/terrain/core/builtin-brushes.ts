import { evaluateTerrainFalloff } from "./falloff";
import { createTerrainNoise, sampleTerrainFractal, type ITerrainNoise } from "./noise";
import type { ITerrainBrushMask, ITerrainBrushShape, TerrainFalloff } from "./types";

export interface ITerrainBuiltinBrush {
	id: string;
	name: string;
	kind: "round" | "square" | "image";
}

/**
 * Built-in brushes of §1.9, in that order. Round and square are analytic shapes (falloff and hardness of the brush settings);
 * the six others are procedural masks generated in code (kind "image").
 */
export const TERRAIN_BUILTIN_BRUSHES: readonly ITerrainBuiltinBrush[] = [
	{ id: "builtin:round", name: "Soft round", kind: "round" },
	{ id: "builtin:square", name: "Square", kind: "square" },
	{ id: "builtin:gaussian", name: "Gaussian", kind: "image" },
	{ id: "builtin:noise", name: "Noisy round", kind: "image" },
	{ id: "builtin:crater", name: "Crater", kind: "image" },
	{ id: "builtin:peak", name: "Peak", kind: "image" },
	{ id: "builtin:plateau", name: "Plateau", kind: "image" },
	{ id: "builtin:ridge", name: "Ridge", kind: "image" },
];

/** Default mask resolution of the brush shapes (library brushes use the same, §6.9). */
const TERRAIN_BUILTIN_MASK_DEFAULT_RESOLUTION = 256;
const TERRAIN_BUILTIN_MASK_MAX_RESOLUTION = 4096;
/** Masks are immutable once generated: shapes share them (at most this many resolutions × ids are kept). */
const TERRAIN_BUILTIN_MASK_CACHE_SIZE = 32;
/** Seed of the "Noisy round" fBm (§1.9). */
const TERRAIN_BUILTIN_NOISE_SEED = 1337;
const TERRAIN_BUILTIN_RIDGE_SEED = 7331;

const builtinMaskCache = new Map<string, ITerrainBrushMask>();

/**
 * Procedural mask of a built-in brush: resolution × resolution values in [0, 1] (peak exactly 1), image order
 * (row 0 = brush +Z at rotation 0, column 0 = brush -X), sampled at the corner-aligned points read by sampleTerrainBrushMask.
 * null for round/square (analytic shapes) and unknown ids. Every call returns a new mask object.
 */
export function createTerrainBuiltinBrushMask(id: string, resolution: number): ITerrainBrushMask | null {
	const mask = getCachedTerrainBuiltinBrushMask(id, resolution);
	if (!mask) {
		return null;
	}

	return {
		width: mask.width,
		height: mask.height,
		data: new Float32Array(mask.data),
	};
}

/**
 * Shape of a built-in brush for the stroke engine and the footprint preview. Unknown ids fall back to "builtin:round" (the returned id tells).
 * Image built-ins share a cached mask (never mutate shape.mask.data).
 */
export function createTerrainBuiltinBrushShape(id: string, falloff: TerrainFalloff, hardness: number, edgeFalloff: boolean, resolution?: number): ITerrainBrushShape {
	const brush = getTerrainBuiltinBrush(id) ?? TERRAIN_BUILTIN_BRUSHES[0];

	return {
		id: brush.id,
		kind: brush.kind,
		mask: brush.kind === "image" ? getCachedTerrainBuiltinBrushMask(brush.id, resolution ?? TERRAIN_BUILTIN_MASK_DEFAULT_RESOLUTION) : null,
		falloff,
		hardness: hardness > 0 ? Math.min(hardness, 0.95) : 0,
		edgeFalloff,
	};
}

function getTerrainBuiltinBrush(id: string): ITerrainBuiltinBrush | null {
	return TERRAIN_BUILTIN_BRUSHES.find((brush) => brush.id === id) ?? null;
}

function getCachedTerrainBuiltinBrushMask(id: string, resolution: number): ITerrainBrushMask | null {
	const brush = getTerrainBuiltinBrush(id);
	if (!brush || brush.kind !== "image") {
		return null;
	}

	const size = normalizeTerrainMaskResolution(resolution);
	const key = `${brush.id}@${size}`;

	const cached = builtinMaskCache.get(key);
	if (cached) {
		return cached;
	}

	const mask = generateTerrainBuiltinBrushMask(brush.id, size);
	if (builtinMaskCache.size >= TERRAIN_BUILTIN_MASK_CACHE_SIZE) {
		const oldest = builtinMaskCache.keys().next().value;
		if (oldest !== undefined) {
			builtinMaskCache.delete(oldest);
		}
	}

	builtinMaskCache.set(key, mask);
	return mask;
}

function normalizeTerrainMaskResolution(resolution: number): number {
	if (!Number.isFinite(resolution)) {
		return TERRAIN_BUILTIN_MASK_DEFAULT_RESOLUTION;
	}

	return Math.min(TERRAIN_BUILTIN_MASK_MAX_RESOLUTION, Math.max(2, Math.round(resolution)));
}

function generateTerrainBuiltinBrushMask(id: string, size: number): ITerrainBrushMask {
	const evaluate = createTerrainBuiltinMaskFunction(id);
	const data = new Float32Array(size * size);
	const step = 2 / (size - 1);

	let max = 0;
	for (let j = 0; j < size; ++j) {
		const bv = 1 - j * step;
		for (let i = 0; i < size; ++i) {
			const bu = -1 + i * step;
			const value = Math.max(0, evaluate(bu, bv, Math.sqrt(bu * bu + bv * bv)));
			data[j * size + i] = value;
			max = Math.max(max, value);
		}
	}

	// The peak is exactly 1 so strength 100 % reaches the full effect (procedural shapes don't always peak at 1).
	if (max > 0 && max !== 1) {
		const scale = 1 / max;
		for (let i = 0; i < data.length; ++i) {
			data[i] = Math.min(1, data[i] * scale);
		}
	}

	return { width: size, height: size, data };
}

type TerrainBuiltinMaskFunction = (bu: number, bv: number, d: number) => number;

function createTerrainBuiltinMaskFunction(id: string): TerrainBuiltinMaskFunction {
	switch (id) {
		case "builtin:gaussian":
			return (_bu, _bv, d) => (d < 1 ? Math.exp(-4.5 * d * d) : 0);

		case "builtin:noise": {
			const noise = createTerrainNoise(TERRAIN_BUILTIN_NOISE_SEED);
			return (bu, bv, d) => {
				const round = evaluateTerrainFalloff("smooth", 0.2, d);
				return round > 0 ? round * fractal01(noise, bu * 3, bv * 3, "fbm") : 0;
			};
		}

		case "builtin:crater":
			// Rim ring minus a bowl: steep inner wall, gentle outer slope, flat (0) centre.
			return (_bu, _bv, d) => {
				if (d >= 1) {
					return 0;
				}

				const ring = (d - 0.7) / 0.18;
				const rim = Math.exp(-ring * ring) * (1 - smoothstep(0.85, 1, d));
				const bowl = d < 0.7 ? 0.8 * (1 - (d / 0.7) * (d / 0.7)) : 0;
				return Math.min(1, Math.max(0, rim - bowl));
			};

		case "builtin:peak":
			return (_bu, _bv, d) => (d < 1 ? Math.pow(1 - d, 2.2) : 0);

		case "builtin:plateau":
			return (_bu, _bv, d) => smoothstep(1, 0.6, d);

		case "builtin:ridge": {
			const noise = createTerrainNoise(TERRAIN_BUILTIN_RIDGE_SEED);
			// Stretched 3:1 along X: the pattern varies 3 times slower along brush X, so the ridges run along X.
			return (bu, bv, d) => {
				const round = evaluateTerrainFalloff("smooth", 0.2, d);
				return round > 0 ? round * fractal01(noise, bu, bv * 3, "ridged") : 0;
			};
		}

		default:
			return (_bu, _bv, d) => evaluateTerrainFalloff("smooth", 0, d);
	}
}

/** Fractal remapped from [-1, 1] to [0, 1]. */
function fractal01(noise: ITerrainNoise, x: number, y: number, type: "fbm" | "ridged"): number {
	const value = sampleTerrainFractal(noise, x, y, { type, octaves: 5, persistence: 0.5, lacunarity: 2 });
	return Math.min(1, Math.max(0, (value + 1) * 0.5));
}

/** GLSL smoothstep (a step when e0 === e1; reversed ramp when e0 > e1). */
function smoothstep(e0: number, e1: number, x: number): number {
	if (e0 === e1) {
		return x < e0 ? 0 : 1;
	}

	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
}
