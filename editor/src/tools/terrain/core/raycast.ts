import type { ITerrainGrid, ITerrainLocalRay, ITerrainRayHit } from "./types";

export interface ITerrainRaycastOptions {
	minHeight: number;
	maxHeight: number;
	/** Hole mask: hole quads are skipped. null/undefined = holes are solid. */
	holes?: Uint8Array | null;
	maxT?: number;
	/** Default true: back faces are ignored (like the editor's isTriangleFacingCamera). */
	frontFacesOnly?: boolean;
}

/** Slab and per-quad height margin, relative to max(W, H) (§4.8). */
const TERRAIN_RAY_HEIGHT_EPSILON = 1e-3;

/**
 * Barycentric tolerance of the triangle test: a ray through a shared edge or vertex is caught by at least one of the triangles
 * despite rounding (u, v are dimensionless, so 1e-7 is far below any visible distance and far above the double rounding error).
 */
const TERRAIN_RAY_BARYCENTRIC_EPSILON = 1e-7;

/** Vertices of the tested triangle (v0, v1, v2, xyz each), filled per quad: no allocation per ray. */
const triangle = new Float64Array(9);

/** Result of the last `intersectTriangle` call: [t, det, e1 × e2 (xyz)]. */
const intersection = new Float64Array(5);

/**
 * Heightfield ray-march (§4.8): slab clip against [-W/2, W/2] x [minHeight - ε, maxHeight + ε] x [-H/2, H/2] (ε = 1e-3 max(W, H)),
 * Amanatides–Woo DDA over the quads in (col, row) space (at most 2S + 2 quads), per quad a hole test, a height bound test and a
 * Möller–Trumbore test of both triangles with the rendered diagonal of §4.1.
 *
 * The ray is in ground-local space and its direction is NOT normalized: t is the parameter of the ray (the world ray parameter when the
 * engine transformed a world ray). Returns the nearest hit with 0 <= t <= maxT, or null.
 */
export function raycastTerrain(heights: Float32Array, grid: ITerrainGrid, ray: ITerrainLocalRay, options: ITerrainRaycastOptions): ITerrainRayHit | null {
	const { ox, oy, oz, dx, dy, dz } = ray;
	if (!Number.isFinite(ox) || !Number.isFinite(oy) || !Number.isFinite(oz) || !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) {
		return null;
	}

	if (dx === 0 && dy === 0 && dz === 0) {
		return null;
	}

	const subdivisions = grid.subdivisions;
	const columns = grid.columns;
	const halfWidth = grid.width / 2;
	const halfHeight = grid.height / 2;
	const epsilon = TERRAIN_RAY_HEIGHT_EPSILON * Math.max(grid.width, grid.height);

	const maxT = options.maxT ?? Infinity;
	const frontFacesOnly = options.frontFacesOnly ?? true;
	const holes = options.holes ?? null;

	// 1. Slab clip.
	let tNear = 0;
	let tFar = maxT;

	if (dx === 0) {
		if (ox < -halfWidth || ox > halfWidth) {
			return null;
		}
	} else {
		const ta = (-halfWidth - ox) / dx;
		const tb = (halfWidth - ox) / dx;
		tNear = Math.max(tNear, Math.min(ta, tb));
		tFar = Math.min(tFar, Math.max(ta, tb));
	}

	const minY = options.minHeight - epsilon;
	const maxY = options.maxHeight + epsilon;
	// An inverted or NaN range (e.g. the { Infinity, -Infinity } range of an empty rect) contains nothing.
	if (!(minY <= maxY)) {
		return null;
	}

	if (dy === 0) {
		if (!(oy >= minY && oy <= maxY)) {
			return null;
		}
	} else {
		const ta = (minY - oy) / dy;
		const tb = (maxY - oy) / dy;
		tNear = Math.max(tNear, Math.min(ta, tb));
		tFar = Math.min(tFar, Math.max(ta, tb));
	}

	if (dz === 0) {
		if (oz < -halfHeight || oz > halfHeight) {
			return null;
		}
	} else {
		const ta = (-halfHeight - oz) / dz;
		const tb = (halfHeight - oz) / dz;
		tNear = Math.max(tNear, Math.min(ta, tb));
		tFar = Math.min(tFar, Math.max(ta, tb));
	}

	if (!(tNear <= tFar)) {
		return null;
	}

	// 2. DDA over the quads, from the entry point.
	let quadCol = clampQuad(Math.floor(grid.colOf(ox + dx * tNear)), subdivisions);
	let quadRow = clampQuad(Math.floor(grid.rowOf(oz + dz * tNear)), subdivisions);

	const stepCol = dx > 0 ? 1 : dx < 0 ? -1 : 0;
	// Rows grow toward -Z.
	const stepRow = dz < 0 ? 1 : dz > 0 ? -1 : 0;

	let tEnter = tNear;
	const maxQuads = 2 * subdivisions + 2;

	for (let visited = 0; visited < maxQuads; ++visited) {
		const x0 = grid.localX(quadCol);
		const x1 = grid.localX(quadCol + 1);
		const z0 = grid.localZ(quadRow);
		const z1 = grid.localZ(quadRow + 1);

		const tExitCol = stepCol > 0 ? (x1 - ox) / dx : stepCol < 0 ? (x0 - ox) / dx : Infinity;
		const tExitRow = stepRow > 0 ? (z1 - oz) / dz : stepRow < 0 ? (z0 - oz) / dz : Infinity;
		const tExit = Math.min(tExitCol, tExitRow, tFar);

		if (!holes || !holes[quadRow * subdivisions + quadCol]) {
			const i00 = quadRow * columns + quadCol;
			const h00 = heights[i00];
			const h10 = heights[i00 + 1];
			const h01 = heights[i00 + columns];
			const h11 = heights[i00 + columns + 1];

			const quadMin = Math.min(h00, h10, h01, h11) - epsilon;
			const quadMax = Math.max(h00, h10, h01, h11) + epsilon;

			const yEnter = oy + dy * tEnter;
			const yExit = oy + dy * tExit;

			// The ray can only cross the quad's triangles where its height range over the quad interval overlaps the corner heights.
			if (Math.min(yEnter, yExit) <= quadMax && Math.max(yEnter, yExit) >= quadMin) {
				let bestT = Infinity;
				let bestNx = 0;
				let bestNy = 0;
				let bestNz = 0;

				// Triangle A = (qr, qc), (qr, qc + 1), (qr + 1, qc + 1): e1 x e2 points up with this order.
				setTriangleVertex(0, x0, h00, z0);
				setTriangleVertex(1, x1, h10, z0);
				setTriangleVertex(2, x1, h11, z1);
				if (intersectTriangle(ray) && acceptHit(frontFacesOnly, maxT)) {
					bestT = intersection[0];
					bestNx = intersection[2];
					bestNy = intersection[3];
					bestNz = intersection[4];
				}

				// Triangle B = (qr, qc), (qr + 1, qc + 1), (qr + 1, qc): e1 x e2 points up with this order.
				setTriangleVertex(1, x1, h11, z1);
				setTriangleVertex(2, x0, h01, z1);
				if (intersectTriangle(ray) && acceptHit(frontFacesOnly, maxT) && intersection[0] < bestT) {
					bestT = intersection[0];
					bestNx = intersection[2];
					bestNy = intersection[3];
					bestNz = intersection[4];
				}

				if (bestT !== Infinity) {
					const invLength = 1 / Math.sqrt(bestNx * bestNx + bestNy * bestNy + bestNz * bestNz);
					const x = ox + dx * bestT;
					const z = oz + dz * bestT;

					return {
						t: bestT,
						x,
						y: oy + dy * bestT,
						z,
						col: Math.min(Math.max(grid.colOf(x), 0), subdivisions),
						row: Math.min(Math.max(grid.rowOf(z), 0), subdivisions),
						quadCol,
						quadRow,
						nx: bestNx * invLength,
						ny: bestNy * invLength,
						nz: bestNz * invLength,
					};
				}
			}
		}

		if (tExit >= tFar) {
			break;
		}

		if (tExitCol <= tExitRow) {
			quadCol += stepCol;
		} else {
			quadRow += stepRow;
		}

		if (quadCol < 0 || quadCol >= subdivisions || quadRow < 0 || quadRow >= subdivisions) {
			break;
		}

		tEnter = Math.max(tEnter, tExit);
	}

	return null;
}

function clampQuad(value: number, subdivisions: number): number {
	return value < 0 ? 0 : value > subdivisions - 1 ? subdivisions - 1 : value;
}

function setTriangleVertex(vertex: number, x: number, y: number, z: number): void {
	const offset = vertex * 3;
	triangle[offset] = x;
	triangle[offset + 1] = y;
	triangle[offset + 2] = z;
}

/**
 * Möller–Trumbore test of the ray against `triangle` (two-sided). On a hit, writes [t, det, e1 x e2] into `intersection` and returns true.
 * With the vertex orders used above (e1 x e2 pointing up), det > 0 means the ray comes from above: dot(n_up, d) < 0.
 */
function intersectTriangle(ray: ITerrainLocalRay): boolean {
	const ax = triangle[0];
	const ay = triangle[1];
	const az = triangle[2];

	const e1x = triangle[3] - ax;
	const e1y = triangle[4] - ay;
	const e1z = triangle[5] - az;
	const e2x = triangle[6] - ax;
	const e2y = triangle[7] - ay;
	const e2z = triangle[8] - az;

	const px = ray.dy * e2z - ray.dz * e2y;
	const py = ray.dz * e2x - ray.dx * e2z;
	const pz = ray.dx * e2y - ray.dy * e2x;

	const det = e1x * px + e1y * py + e1z * pz;
	if (det === 0 || !Number.isFinite(det)) {
		return false;
	}

	const invDet = 1 / det;

	const sx = ray.ox - ax;
	const sy = ray.oy - ay;
	const sz = ray.oz - az;

	const u = (sx * px + sy * py + sz * pz) * invDet;
	if (u < -TERRAIN_RAY_BARYCENTRIC_EPSILON || u > 1 + TERRAIN_RAY_BARYCENTRIC_EPSILON) {
		return false;
	}

	const qx = sy * e1z - sz * e1y;
	const qy = sz * e1x - sx * e1z;
	const qz = sx * e1y - sy * e1x;

	const v = (ray.dx * qx + ray.dy * qy + ray.dz * qz) * invDet;
	if (v < -TERRAIN_RAY_BARYCENTRIC_EPSILON || u + v > 1 + TERRAIN_RAY_BARYCENTRIC_EPSILON) {
		return false;
	}

	intersection[0] = (e2x * qx + e2y * qy + e2z * qz) * invDet;
	intersection[1] = det;
	intersection[2] = e1y * e2z - e1z * e2y;
	intersection[3] = e1z * e2x - e1x * e2z;
	intersection[4] = e1x * e2y - e1y * e2x;

	return true;
}

/** Range and facing rules of the last intersection: 0 <= t <= maxT, and det > 0 (front face) when frontFacesOnly. */
function acceptHit(frontFacesOnly: boolean, maxT: number): boolean {
	const t = intersection[0];
	if (!(t >= 0 && t <= maxT)) {
		return false;
	}

	return !frontFacesOnly || intersection[1] > 0;
}
