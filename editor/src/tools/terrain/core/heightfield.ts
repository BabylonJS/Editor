import { clampTerrainRect, isTerrainRectEmpty } from "./rect";
import type { ITerrainGrid, ITerrainRect } from "./types";

/**
 * Compact heightfield helpers (§4.1). Heights are local Y values, one per vertex, row-major: heights[r (S + 1) + c], row 0 = +Z edge.
 */

/** Copies the Y of every vertex (stride 3) into `out` (reused when it has (S + 1)² entries or more) or a new Float32Array. */
export function extractTerrainHeights(positions: ArrayLike<number>, grid: ITerrainGrid, out?: Float32Array): Float32Array {
	const vertexCount = grid.columns * grid.rows;
	const heights = out && out.length >= vertexCount ? out : new Float32Array(vertexCount);

	for (let i = 0, offset = 1; i < vertexCount; ++i, offset += 3) {
		heights[i] = positions[offset];
	}

	return heights;
}

/** positions[3 i + 1] = heights[i] for every vertex of `rect` (vertex space, clamped to the grid). */
export function writeTerrainHeightsToPositions(heights: Float32Array, grid: ITerrainGrid, rect: ITerrainRect, positions: Float32Array): void {
	const clamped = clampTerrainRect(rect, grid.columns, grid.rows);
	if (isTerrainRectEmpty(clamped)) {
		return;
	}

	const columns = grid.columns;
	for (let row = clamped.y0; row <= clamped.y1; ++row) {
		const rowStart = row * columns;
		for (let index = rowStart + clamped.x0, end = rowStart + clamped.x1; index <= end; ++index) {
			positions[index * 3 + 1] = heights[index];
		}
	}
}

/** (S + 1)² x 3 positions of the §4.1 grid with the given heights. */
export function buildTerrainPositions(heights: Float32Array, grid: ITerrainGrid): Float32Array {
	const columns = grid.columns;
	const rows = grid.rows;
	const positions = new Float32Array(columns * rows * 3);

	const xs = new Float64Array(columns);
	for (let col = 0; col < columns; ++col) {
		xs[col] = grid.localX(col);
	}

	for (let row = 0, index = 0; row < rows; ++row) {
		const z = grid.localZ(row);
		for (let col = 0; col < columns; ++col, ++index) {
			const offset = index * 3;
			positions[offset] = xs[col];
			positions[offset + 1] = heights[index];
			positions[offset + 2] = z;
		}
	}

	return positions;
}

/** (S + 1)² x 2 UVs: (c / S, 1 - r / S), like Babylon's `CreateGroundVertexData`. */
export function buildTerrainUVs(grid: ITerrainGrid): Float32Array {
	const subdivisions = grid.subdivisions;
	const columns = grid.columns;
	const rows = grid.rows;
	const uvs = new Float32Array(columns * rows * 2);

	for (let row = 0, offset = 0; row < rows; ++row) {
		const v = 1.0 - row / subdivisions;
		for (let col = 0; col < columns; ++col, offset += 2) {
			uvs[offset] = col / subdivisions;
			uvs[offset + 1] = v;
		}
	}

	return uvs;
}

/** Interpolates on the two triangles of the cell with the rendered diagonal (§4.1). Clamped to the grid. */
export function sampleTerrainHeight(heights: Float32Array, grid: ITerrainGrid, x: number, z: number): number {
	const subdivisions = grid.subdivisions;
	const columns = grid.columns;

	const col = clamp(grid.colOf(x), 0, subdivisions);
	const row = clamp(grid.rowOf(z), 0, subdivisions);

	const quadCol = Math.min(Math.floor(col), subdivisions - 1);
	const quadRow = Math.min(Math.floor(row), subdivisions - 1);

	const fx = col - quadCol;
	const fz = row - quadRow;

	const i00 = quadRow * columns + quadCol;
	const h00 = heights[i00];
	const h10 = heights[i00 + 1];
	const h01 = heights[i00 + columns];
	const h11 = heights[i00 + columns + 1];

	// Triangle A covers fx >= fz, triangle B covers fz > fx (§4.1).
	if (fx >= fz) {
		return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
	}

	return h00 + (h01 - h00) * fz + (h11 - h01) * fx;
}

/** Local dh/dx and dh/dz (central differences on the cell corners, bilinear). */
export function sampleTerrainGradient(heights: Float32Array, grid: ITerrainGrid, x: number, z: number): { dx: number; dz: number } {
	const subdivisions = grid.subdivisions;

	const col = clamp(grid.colOf(x), 0, subdivisions);
	const row = clamp(grid.rowOf(z), 0, subdivisions);

	const quadCol = Math.min(Math.floor(col), subdivisions - 1);
	const quadRow = Math.min(Math.floor(row), subdivisions - 1);

	const fx = col - quadCol;
	const fz = row - quadRow;

	const w00 = (1 - fx) * (1 - fz);
	const w10 = fx * (1 - fz);
	const w01 = (1 - fx) * fz;
	const w11 = fx * fz;

	const dx =
		w00 * vertexGradientX(heights, grid, quadCol, quadRow) +
		w10 * vertexGradientX(heights, grid, quadCol + 1, quadRow) +
		w01 * vertexGradientX(heights, grid, quadCol, quadRow + 1) +
		w11 * vertexGradientX(heights, grid, quadCol + 1, quadRow + 1);

	const dz =
		w00 * vertexGradientZ(heights, grid, quadCol, quadRow) +
		w10 * vertexGradientZ(heights, grid, quadCol + 1, quadRow) +
		w01 * vertexGradientZ(heights, grid, quadCol, quadRow + 1) +
		w11 * vertexGradientZ(heights, grid, quadCol + 1, quadRow + 1);

	return { dx, dz };
}

/**
 * Minimum and maximum local height over `rect` (vertex space, clamped to the grid), or over every vertex when `rect` is omitted.
 * An empty rect gives { min: Infinity, max: -Infinity } (the identity of a union of ranges).
 */
export function computeTerrainHeightRange(heights: Float32Array, grid: ITerrainGrid, rect?: ITerrainRect): { min: number; max: number } {
	const columns = grid.columns;
	const clamped = clampTerrainRect(rect ?? { x0: 0, y0: 0, x1: grid.subdivisions, y1: grid.subdivisions }, columns, grid.rows);

	let min = Infinity;
	let max = -Infinity;

	if (isTerrainRectEmpty(clamped)) {
		return { min, max };
	}

	for (let row = clamped.y0; row <= clamped.y1; ++row) {
		const rowStart = row * columns;
		for (let index = rowStart + clamped.x0, end = rowStart + clamped.x1; index <= end; ++index) {
			const h = heights[index];
			if (h < min) {
				min = h;
			}
			if (h > max) {
				max = h;
			}
		}
	}

	return { min, max };
}

/** dh/dx at vertex (col, row): central difference, one cell step on the -X/+X borders (§4.7). */
function vertexGradientX(heights: Float32Array, grid: ITerrainGrid, col: number, row: number): number {
	const left = col > 0 ? col - 1 : col;
	const right = col < grid.subdivisions ? col + 1 : col;
	const rowStart = row * grid.columns;

	return (heights[rowStart + right] - heights[rowStart + left]) / ((right - left) * grid.cellX);
}

/** dh/dz at vertex (col, row): z grows toward row 0 (the +Z edge), so dh/dz = (hN - hS) / (steps cellZ) (§4.7). */
function vertexGradientZ(heights: Float32Array, grid: ITerrainGrid, col: number, row: number): number {
	const north = row > 0 ? row - 1 : row;
	const south = row < grid.subdivisions ? row + 1 : row;
	const columns = grid.columns;

	return (heights[north * columns + col] - heights[south * columns + col]) / ((south - north) * grid.cellZ);
}

function clamp(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}
