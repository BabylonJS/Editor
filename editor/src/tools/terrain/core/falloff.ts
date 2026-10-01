import type { TerrainFalloff } from "./types";

/** Number of intervals of the d²-indexed falloff LUT (§4.2). */
export const TERRAIN_FALLOFF_LUT_SIZE: number = 1024;

/** Maximum hardness: the falloff always keeps at least 5 % of the radius to fade out. */
const TERRAIN_MAX_HARDNESS = 0.95;
/** exp(-4.5): value of the raw gaussian at t = 1, removed so the normalized curve reaches 0 at the brush edge. */
const TERRAIN_GAUSSIAN_FLOOR = Math.exp(-4.5);
const TERRAIN_GAUSSIAN_RANGE = 1 - TERRAIN_GAUSSIAN_FLOOR;

/**
 * Falloff curve value at the normalized distance d (§4.2).
 * With k = clamp(hardness, 0, 0.95) and t = clamp01((d - k) / (1 - k)): smooth 1 - t²(3 - 2t), linear 1 - t, spherical sqrt(1 - t²), sharp (1 - t)²,
 * constant 1, gaussian (exp(-4.5 t²) - exp(-4.5)) / (1 - exp(-4.5)). Returns 0 for d >= 1 (and for NaN), 1 for d <= k.
 */
export function evaluateTerrainFalloff(falloff: TerrainFalloff, hardness: number, d: number): number {
	if (!(d < 1)) {
		return 0;
	}

	const k = clampTerrainHardness(hardness);
	const t = d <= k ? 0 : (d - k) / (1 - k);

	switch (falloff) {
		case "linear":
			return 1 - t;
		case "spherical":
			return Math.sqrt(Math.max(0, 1 - t * t));
		case "sharp":
			return (1 - t) * (1 - t);
		case "constant":
			return 1;
		case "gaussian":
			return Math.max(0, (Math.exp(-4.5 * t * t) - TERRAIN_GAUSSIAN_FLOOR) / TERRAIN_GAUSSIAN_RANGE);
		default:
			// "smooth" (and unknown values from tolerant callers).
			return 1 - t * t * (3 - 2 * t);
	}
}

/**
 * TERRAIN_FALLOFF_LUT_SIZE + 1 entries; entry i = f(sqrt(i / TERRAIN_FALLOFF_LUT_SIZE)).
 * Looked up with lut[floor(d² × TERRAIN_FALLOFF_LUT_SIZE)] for d² < 1 (no square root per element, §4.2); the last entry is f(1) = 0.
 */
export function createTerrainFalloffLut(falloff: TerrainFalloff, hardness: number): Float32Array {
	const lut = new Float32Array(TERRAIN_FALLOFF_LUT_SIZE + 1);
	for (let i = 0; i <= TERRAIN_FALLOFF_LUT_SIZE; ++i) {
		lut[i] = evaluateTerrainFalloff(falloff, hardness, Math.sqrt(i / TERRAIN_FALLOFF_LUT_SIZE));
	}

	return lut;
}

function clampTerrainHardness(hardness: number): number {
	if (!(hardness > 0)) {
		return 0;
	}

	return Math.min(hardness, TERRAIN_MAX_HARDNESS);
}
