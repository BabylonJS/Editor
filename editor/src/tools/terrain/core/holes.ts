import type { ITerrainGrid } from "./types";

/**
 * Hole mask ↔ compacted indices (§4.6). The mask has S² bytes (quad (qc, qr) at qr S + qc), 1 = hole.
 *
 * Quad (qc, qr) is drawn as triangle A = [(qr+1, qc+1), (qr, qc+1), (qr, qc)] then triangle B = [(qr+1, qc), (qr+1, qc+1), (qr, qc)]
 * (entries are (row, col)): the exact order and winding of Babylon's `CreateGroundVertexData`.
 */

const TRIANGLE_A = 1;
const TRIANGLE_B = 2;

/**
 * A quad is solid only when both of its triangles exist (§4.6); partialQuads counts quads with exactly one triangle.
 *
 * Each triangle is assigned to the quad of its smallest vertex index m = qr (S + 1) + qc (ignored when qc = S or qr = S): it is A when its
 * vertices are exactly {m, m + 1, m + S + 2}, B when they are exactly {m, m + S + 1, m + S + 2}; any other triangle (degenerate, other
 * diagonal, spanning several quads) is ignored.
 */
export function terrainHolesFromIndices(grid: ITerrainGrid, indices: ArrayLike<number>): { holes: Uint8Array; partialQuads: number } {
	const subdivisions = grid.subdivisions;
	const columns = grid.columns;
	const quadCount = subdivisions * subdivisions;

	const triangles = new Uint8Array(quadCount);

	for (let k = 0, end = indices.length - 2; k < end; k += 3) {
		const a = indices[k];
		const b = indices[k + 1];
		const c = indices[k + 2];

		const m = a < b ? (a < c ? a : c) : b < c ? b : c;
		const quadRow = Math.floor(m / columns);
		const quadCol = m - quadRow * columns;

		if (quadCol >= subdivisions || quadRow >= subdivisions || quadRow < 0) {
			continue;
		}

		const diagonal = m + columns + 1;
		if (a !== diagonal && b !== diagonal && c !== diagonal) {
			continue;
		}

		const right = m + 1;
		const down = m + columns;

		if (a === right || b === right || c === right) {
			triangles[quadRow * subdivisions + quadCol] |= TRIANGLE_A;
		} else if (a === down || b === down || c === down) {
			triangles[quadRow * subdivisions + quadCol] |= TRIANGLE_B;
		}
	}

	const holes = new Uint8Array(quadCount);
	let partialQuads = 0;

	for (let quad = 0; quad < quadCount; ++quad) {
		const present = triangles[quad];
		if (present !== (TRIANGLE_A | TRIANGLE_B)) {
			holes[quad] = 1;
			if (present !== 0) {
				++partialQuads;
			}
		}
	}

	return { holes, partialQuads };
}

/** Compacted canonical indices (quad order, winding of CreateGroundVertexData), hole quads omitted. */
export function buildTerrainIndices(grid: ITerrainGrid, holes: Uint8Array | null): Uint32Array {
	const subdivisions = grid.subdivisions;
	const columns = grid.columns;
	const quadCount = subdivisions * subdivisions;

	const solidQuads = holes ? quadCount - countTerrainHoles(holes.length > quadCount ? holes.subarray(0, quadCount) : holes) : quadCount;
	const indices = new Uint32Array(solidQuads * 6);

	let offset = 0;
	for (let quadRow = 0; quadRow < subdivisions; ++quadRow) {
		const quadStart = quadRow * subdivisions;
		const rowStart = quadRow * columns;
		const nextRowStart = rowStart + columns;

		for (let quadCol = 0; quadCol < subdivisions; ++quadCol) {
			if (holes && holes[quadStart + quadCol]) {
				continue;
			}

			// A = (qr+1, qc+1), (qr, qc+1), (qr, qc); B = (qr+1, qc), (qr+1, qc+1), (qr, qc).
			indices[offset] = nextRowStart + quadCol + 1;
			indices[offset + 1] = rowStart + quadCol + 1;
			indices[offset + 2] = rowStart + quadCol;
			indices[offset + 3] = nextRowStart + quadCol;
			indices[offset + 4] = nextRowStart + quadCol + 1;
			indices[offset + 5] = rowStart + quadCol;

			offset += 6;
		}
	}

	return indices;
}

/** Number of hole quads (non-zero entries) of a mask. */
export function countTerrainHoles(holes: Uint8Array): number {
	let count = 0;
	for (let i = 0, length = holes.length; i < length; ++i) {
		if (holes[i] !== 0) {
			++count;
		}
	}

	return count;
}
