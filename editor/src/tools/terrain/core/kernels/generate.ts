import { createTerrainNoise, sampleTerrainFractal, type TerrainNoiseType } from "../noise";
import type { ITerrainGrid, ITerrainMetric } from "../types";

export interface ITerrainGenerateParams {
	type: "fbm" | "ridged" | "billow" | "islands";
	seed: number;
	/** Feature size in world cm. */
	scale: number;
	minWorld: number;
	maxWorld: number;
	octaves: number;
	persistence: number;
	lacunarity: number;
	/** Domain warp strength, 0..2. */
	warp: number;
	edgeFalloff: "none" | "island";
	/** 0..200000; applied by the engine after generation. */
	erosionDroplets: number;
	/** 0..64; applied by the engine after erosion. */
	terraceSteps: number;
}

/** Arguments of generateTerrainHeightRows. */
export interface ITerrainGenerateRowsTarget {
	grid: ITerrainGrid;
	metric: ITerrainMetric;
	params: ITerrainGenerateParams;
	worldToLocalHeight: (worldY: number) => number;
	/** Current heights (read in "add" mode). */
	current: Float32Array;
	mode: "replace" | "add";
	/** (S+1)² output heights; may be the `current` array. */
	out: Float32Array;
}

/** Domain warp offsets of §4.11. */
const WARP_OFFSET_X = [5.2, 1.3];
const WARP_OFFSET_Z = [1.7, 9.2];

/** GLSL smoothstep (edge0 > edge1 allowed); a step when edge0 = edge1. */
function smoothstep(edge0: number, edge1: number, value: number): number {
	if (edge0 === edge1) {
		return value < edge0 ? 0 : 1;
	}

	let t = (value - edge0) / (edge1 - edge0);
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	return t * t * (3 - 2 * t);
}

/**
 * Whole-terrain generator (§4.11). Per vertex: p = (mx, mz) / scale; warp p += warp × 0.5 × (fbm(p + (5.2, 1.3)), fbm(p + (1.7, 9.2)));
 * n = fractal(p) (islands use fBm); t = (n + 1) / 2; island falloff t ×= smoothstep(1, 0.6, d) with d = |(x / (W/2), z / (H/2))|;
 * Y = minWorld + t (maxWorld − minWorld); replace h = worldToLocal(Y), add h = current + Y / sy. Erosion and terraces are applied by the engine.
 * Generates the rows [rowStart, rowEnd) into target.out: the result of a row doesn't depend on the other rows, so the engine can run a
 * generation in slices (§7.4).
 */
export function generateTerrainHeightRows(target: ITerrainGenerateRowsTarget, rowStart: number, rowEnd: number): void {
	const { grid, metric, params, current, out } = target;
	const first = Math.max(0, Math.floor(rowStart));
	const end = Math.min(grid.rows, Math.ceil(rowEnd));
	if (end <= first) {
		return;
	}

	const noise = createTerrainNoise(params.seed);
	const type: TerrainNoiseType = params.type === "islands" ? "fbm" : params.type;
	const fractal = { type, octaves: params.octaves, persistence: params.persistence, lacunarity: params.lacunarity };
	const warpFractal = { type: "fbm" as TerrainNoiseType, octaves: params.octaves, persistence: params.persistence, lacunarity: params.lacunarity };
	const warp = Number.isFinite(params.warp) && params.warp > 0 ? params.warp * 0.5 : 0;
	const island = params.edgeFalloff === "island" || params.type === "islands";
	const inverseScale = 1 / Math.max(Number.isFinite(params.scale) ? params.scale : 1, 1e-6);
	const minWorld = params.minWorld;
	const range = params.maxWorld - params.minWorld;
	const add = target.mode === "add";

	const columns = grid.columns;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;
	const inverseHalfWidth = halfWidth > 0 ? 1 / halfWidth : 0;
	const inverseHalfHeight = halfHeight > 0 ? 1 / halfHeight : 0;

	for (let row = first; row < end; ++row) {
		const z = halfHeight - row * grid.cellZ;
		const baseZ = z * metric.sz * inverseScale;
		const islandZ = z * inverseHalfHeight;

		for (let column = 0; column < columns; ++column) {
			const x = column * grid.cellX - halfWidth;
			let px = x * metric.sx * inverseScale;
			let pz = baseZ;

			if (warp > 0) {
				const warpX = sampleTerrainFractal(noise, px + WARP_OFFSET_X[0], pz + WARP_OFFSET_X[1], warpFractal);
				const warpZ = sampleTerrainFractal(noise, px + WARP_OFFSET_Z[0], pz + WARP_OFFSET_Z[1], warpFractal);
				px += warp * warpX;
				pz += warp * warpZ;
			}

			let t = (sampleTerrainFractal(noise, px, pz, fractal) + 1) * 0.5;
			t = t < 0 ? 0 : t > 1 ? 1 : t;

			if (island) {
				const islandX = x * inverseHalfWidth;
				t *= smoothstep(1, 0.6, Math.sqrt(islandX * islandX + islandZ * islandZ));
			}

			const worldY = minWorld + t * range;
			const index = row * columns + column;
			out[index] = add ? current[index] + worldY / metric.sy : target.worldToLocalHeight(worldY);
		}
	}
}

/**
 * Defaults of MCP generate_terrain (§8.1 rule 12): fbm, seed = random 31-bit integer, scale = max(W, H) / 4,
 * min 0, max round(0.08 max(W, H)), octaves 6, persistence 0.5, lacunarity 2, warp 0.3, edgeFalloff "none", no erosion, no terraces. W/H in world cm.
 */
export function createDefaultTerrainGenerateParams(width: number, height: number): ITerrainGenerateParams {
	const size = Math.max(Number.isFinite(width) ? Math.abs(width) : 0, Number.isFinite(height) ? Math.abs(height) : 0);

	return {
		type: "fbm",
		seed: Math.floor(Math.random() * 0x80000000),
		scale: size / 4,
		minWorld: 0,
		maxWorld: Math.round(0.08 * size),
		octaves: 6,
		persistence: 0.5,
		lacunarity: 2,
		warp: 0.3,
		edgeFalloff: "none",
		erosionDroplets: 0,
		terraceSteps: 0,
	};
}
