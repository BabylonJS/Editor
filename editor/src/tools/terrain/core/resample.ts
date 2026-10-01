import type { ITerrainGrid } from "./types";

/**
 * Grid resampling (§4.9), in normalized grid space: the sizes of `from` and `to` don't matter (a resize that keeps S keeps every
 * height and stretches the relief).
 */

/**
 * Destination vertex (c', r') samples the source at (c' S / S', r' S / S') bilinearly on the 4 surrounding source vertices.
 * Corners are preserved exactly, constant fields stay constant and linear ramps stay linear. Returns (S' + 1)² heights.
 */
export function resampleTerrainHeights(source: Float32Array, from: ITerrainGrid, to: ITerrainGrid): Float32Array {
	const sourceSubdivisions = from.subdivisions;
	const sourceColumns = from.columns;
	const targetSubdivisions = to.subdivisions;
	const targetColumns = to.columns;

	const result = new Float32Array(targetColumns * to.rows);

	// Source cell and fraction per destination column (the same table serves the rows: both grids are square).
	const cells = new Int32Array(targetColumns);
	const fractions = new Float64Array(targetColumns);
	for (let i = 0; i < targetColumns; ++i) {
		const position = (i * sourceSubdivisions) / targetSubdivisions;
		const cell = Math.min(Math.floor(position), sourceSubdivisions - 1);
		cells[i] = cell;
		fractions[i] = position - cell;
	}

	for (let row = 0, index = 0; row < to.rows; ++row) {
		const sourceRow = cells[row];
		const fz = fractions[row];
		const rowStart = sourceRow * sourceColumns;
		const nextRowStart = rowStart + sourceColumns;

		for (let col = 0; col < targetColumns; ++col, ++index) {
			const sourceCol = cells[col];
			const fx = fractions[col];

			const h00 = source[rowStart + sourceCol];
			const h10 = source[rowStart + sourceCol + 1];
			const h01 = source[nextRowStart + sourceCol];
			const h11 = source[nextRowStart + sourceCol + 1];

			const top = h00 + (h10 - h00) * fx;
			const bottom = h01 + (h11 - h01) * fx;
			result[index] = top + (bottom - top) * fz;
		}
	}

	return result;
}

/**
 * Destination quad (qc', qr') copies the source quad containing its centre: (clamp(floor((qc' + 0.5) S / S')), clamp(floor((qr' + 0.5) S / S'))).
 * Returns S'² bytes.
 */
export function resampleTerrainHoles(source: Uint8Array, from: ITerrainGrid, to: ITerrainGrid): Uint8Array {
	const sourceSubdivisions = from.subdivisions;
	const targetSubdivisions = to.subdivisions;

	const result = new Uint8Array(targetSubdivisions * targetSubdivisions);

	const cells = new Int32Array(targetSubdivisions);
	for (let i = 0; i < targetSubdivisions; ++i) {
		const cell = Math.floor(((i + 0.5) * sourceSubdivisions) / targetSubdivisions);
		cells[i] = Math.min(Math.max(cell, 0), sourceSubdivisions - 1);
	}

	for (let row = 0, index = 0; row < targetSubdivisions; ++row) {
		const rowStart = cells[row] * sourceSubdivisions;
		for (let col = 0; col < targetSubdivisions; ++col, ++index) {
			result[index] = source[rowStart + cells[col]];
		}
	}

	return result;
}
