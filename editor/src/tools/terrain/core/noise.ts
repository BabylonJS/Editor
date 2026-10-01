import { mulberry32 } from "./random";

export type TerrainNoiseType = "fbm" | "ridged" | "billow";

export interface ITerrainNoise {
	/** Seeded 2D simplex noise in [-1, 1]. */
	sample(x: number, y: number): number;
}

/** Skewing factors of 2D simplex noise: F2 = (sqrt(3) - 1) / 2, G2 = (3 - sqrt(3)) / 6. */
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/** Gustavson's 12 gradients (the xy part of the 3D edge gradients). */
const GRADIENTS_X = new Float64Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]);
const GRADIENTS_Y = new Float64Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]);

/** Upper bound of the octave count (a guard against runaway loops; the UI and MCP offer far fewer). */
const TERRAIN_NOISE_MAX_OCTAVES = 32;

/**
 * Seeded 2D simplex noise (§4.11): Stefan Gustavson's 2D simplex noise with its permutation table shuffled (Fisher–Yates) by
 * `mulberry32(seed)`. The same seed always gives the same noise; the result is clamped to [-1, 1].
 */
export function createTerrainNoise(seed: number): ITerrainNoise {
	const random = mulberry32(seed);

	const permutation = new Uint8Array(256);
	for (let i = 0; i < 256; ++i) {
		permutation[i] = i;
	}

	for (let i = 255; i > 0; --i) {
		const j = Math.floor(random() * (i + 1));
		const swap = permutation[i];
		permutation[i] = permutation[j];
		permutation[j] = swap;
	}

	const perm = new Uint8Array(512);
	const permMod12 = new Uint8Array(512);
	for (let i = 0; i < 512; ++i) {
		perm[i] = permutation[i & 255];
		permMod12[i] = perm[i] % 12;
	}

	return {
		sample: (x: number, y: number): number => {
			// Skew the input space to find the simplex cell.
			const s = (x + y) * F2;
			const i = Math.floor(x + s);
			const j = Math.floor(y + s);

			const t = (i + j) * G2;
			const x0 = x - (i - t);
			const y0 = y - (j - t);

			// Lower or upper triangle of the cell.
			const i1 = x0 > y0 ? 1 : 0;
			const j1 = x0 > y0 ? 0 : 1;

			const x1 = x0 - i1 + G2;
			const y1 = y0 - j1 + G2;
			const x2 = x0 - 1 + 2 * G2;
			const y2 = y0 - 1 + 2 * G2;

			const ii = i & 255;
			const jj = j & 255;

			let n = 0;

			let t0 = 0.5 - x0 * x0 - y0 * y0;
			if (t0 > 0) {
				const g = permMod12[ii + perm[jj]];
				t0 *= t0;
				n += t0 * t0 * (GRADIENTS_X[g] * x0 + GRADIENTS_Y[g] * y0);
			}

			let t1 = 0.5 - x1 * x1 - y1 * y1;
			if (t1 > 0) {
				const g = permMod12[ii + i1 + perm[jj + j1]];
				t1 *= t1;
				n += t1 * t1 * (GRADIENTS_X[g] * x1 + GRADIENTS_Y[g] * y1);
			}

			let t2 = 0.5 - x2 * x2 - y2 * y2;
			if (t2 > 0) {
				const g = permMod12[ii + 1 + perm[jj + 1]];
				t2 *= t2;
				n += t2 * t2 * (GRADIENTS_X[g] * x2 + GRADIENTS_Y[g] * y2);
			}

			// Scaled to [-1, 1] (the classic factor 70), clamped against rounding.
			const value = 70 * n;
			return value < -1 ? -1 : value > 1 ? 1 : value;
		},
	};
}

/**
 * Normalized fractal in [-1, 1] (§4.11): Σ a_o N_o / Σ |a_o| over the octaves with a_0 = 1, a_(o+1) = a_o persistence,
 * f_0 = 1, f_(o+1) = f_o lacunarity and N_o computed from n = noise(x f_o, y f_o): fbm n, ridged 2 (1 - |n|)² - 1, billow 2 |n| - 1.
 * `octaves` is floored and clamped to [1, 32].
 */
export function sampleTerrainFractal(
	noise: ITerrainNoise,
	x: number,
	y: number,
	options: { type: TerrainNoiseType; octaves: number; persistence: number; lacunarity: number }
): number {
	const octaves = Math.min(TERRAIN_NOISE_MAX_OCTAVES, Math.max(1, Math.floor(options.octaves) || 1));
	const persistence = options.persistence;
	const lacunarity = options.lacunarity;
	const type = options.type;

	let amplitude = 1;
	let frequency = 1;
	let sum = 0;
	let norm = 0;

	for (let octave = 0; octave < octaves; ++octave) {
		const n = noise.sample(x * frequency, y * frequency);

		let value: number;
		if (type === "ridged") {
			const ridge = 1 - Math.abs(n);
			value = 2 * ridge * ridge - 1;
		} else if (type === "billow") {
			value = 2 * Math.abs(n) - 1;
		} else {
			value = n;
		}

		sum += amplitude * value;
		norm += Math.abs(amplitude);

		amplitude *= persistence;
		frequency *= lacunarity;
	}

	if (!(norm > 0) || !Number.isFinite(sum / norm)) {
		return 0;
	}

	const result = sum / norm;
	return result < -1 ? -1 : result > 1 ? 1 : result;
}
