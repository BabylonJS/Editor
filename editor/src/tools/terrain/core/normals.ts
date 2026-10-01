import { expandTerrainRect, isTerrainRectEmpty } from "./rect";
import type { ITerrainGrid, ITerrainRect } from "./types";

/**
 * Writes normals of expand(rect, 1) ∩ grid into `normals` (stride 3, local); returns the written rect (§4.7).
 *
 * For vertex (c, r): n = normalize((hL - hR) / (Δc cellX), 1, (hS - hN) / (Δr cellZ)) with hL = h(c - 1, r), hR = h(c + 1, r),
 * hN = h(c, r - 1) (+Z side), hS = h(c, r + 1); on the borders the vertex itself replaces the missing neighbour and Δc/Δr = 1
 * (a single cell step), otherwise Δc = Δr = 2. An empty `rect` writes nothing and returns an empty rect.
 */
export function computeTerrainNormals(heights: Float32Array, grid: ITerrainGrid, rect: ITerrainRect, normals: Float32Array): ITerrainRect {
	const columns = grid.columns;
	const subdivisions = grid.subdivisions;

	const written = expandTerrainRect(rect, 1, columns, grid.rows);
	if (isTerrainRectEmpty(written)) {
		return written;
	}

	const invCellX = 1 / grid.cellX;
	const invCellZ = 1 / grid.cellZ;
	const invTwoCellX = 0.5 * invCellX;
	const invTwoCellZ = 0.5 * invCellZ;

	const x0 = written.x0;
	const x1 = written.x1;

	for (let row = written.y0; row <= written.y1; ++row) {
		const north = row > 0 ? row - 1 : row;
		const south = row < subdivisions ? row + 1 : row;
		const invDz = south - north === 2 ? invTwoCellZ : invCellZ;

		const rowStart = row * columns;
		const northStart = north * columns;
		const southStart = south * columns;

		for (let col = x0; col <= x1; ++col) {
			const left = col > 0 ? col - 1 : col;
			const right = col < subdivisions ? col + 1 : col;
			const invDx = right - left === 2 ? invTwoCellX : invCellX;

			const nx = (heights[rowStart + left] - heights[rowStart + right]) * invDx;
			const nz = (heights[southStart + col] - heights[northStart + col]) * invDz;
			const invLength = 1 / Math.sqrt(nx * nx + 1 + nz * nz);

			const offset = (rowStart + col) * 3;
			normals[offset] = nx * invLength;
			normals[offset + 1] = invLength;
			normals[offset + 2] = nz * invLength;
		}
	}

	return written;
}
