import type { FloatArray, IndicesArray, Nullable } from "@babylonjs/core/types";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";

import { Ray } from "@babylonjs/core/Culling/ray";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3, type Matrix } from "@babylonjs/core/Maths/math.vector";

import { isTerrainMesh } from "../tools/guards";

/** Tolerance, in cells, of the terrain rectangle test: points on the border (up to rounding) are inside. */
const TERRAIN_HEIGHT_EDGE_TOLERANCE = 1e-6;
/** §6.7.1: the local Y axis is world-vertical when |m[4]| and |m[6]| are below this fraction of its length. */
const TERRAIN_HEIGHT_TILT_TOLERANCE = 1e-3;
/** A world matrix with a scale component below this value is degenerate: its terrain has no queryable surface. */
const TERRAIN_HEIGHT_MIN_SCALE = 1e-6;
/** Fixed-point iterations following the world vertical when the local Y axis is almost (not exactly) world-vertical. */
const TERRAIN_HEIGHT_VERTICAL_ITERATIONS = 4;

interface ITerrainHeightField {
	readonly subdivisions: number;
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
	readonly cellX: number;
	readonly cellZ: number;
	/** Local heights (Y of the positions), row-major (S+1)², row 0 = +Z edge, column 0 = -X edge (§4.1). */
	readonly heights: Float32Array;
	readonly minHeight: number;
	readonly maxHeight: number;
	/**
	 * Triangles of each quad (row-major S²) found in the index buffer (§4.6): bit 0 = triangle A, bit 1 = triangle B (§4.1).
	 * A missing triangle is a hole. null when the index count is 6 S² (every quad solid).
	 */
	readonly triangles: Uint8Array | null;
}

interface ITerrainHeightFieldEntry {
	/** Identity of the position data the field was extracted from. */
	readonly positions: unknown;
	/** Identity of the index array the triangle mask was extracted from. */
	readonly indices: Nullable<IndicesArray>;
	/** null when the positions don't form a square (S+1)² grid (not queryable). */
	readonly field: ITerrainHeightField | null;
}

interface ITerrainHeightTransform {
	readonly matrix: Matrix;
	updateFlag: number;
	/** false when the world matrix is degenerate. */
	valid: boolean;
	/** true when the local Y axis is not world-vertical (§6.7.1): heights then come from a vertical pick. */
	tilted: boolean;
	/** Linear part of the world matrix, row-major (rows are the images of the local X, Y and Z axes), followed by the translation. */
	readonly world: Float64Array;
	/** Inverse of the linear part, row-major. */
	readonly inverse: Float64Array;
}

interface ITerrainTriangleLookup {
	/** Local height of the surface at the looked-up point. */
	height: number;
	/** true for triangle B (fz > fx), false for triangle A (§4.1). */
	triangleB: boolean;
	h00: number;
	h10: number;
	h01: number;
	h11: number;
}

/** Heightfields keyed by the position VertexBuffer they come from: clones sharing a geometry and instances share one field. */
const terrainHeightFields = new WeakMap<object, ITerrainHeightFieldEntry>();
/** World matrix data keyed by the queried mesh. */
const terrainHeightTransforms = new WeakMap<AbstractMesh, ITerrainHeightTransform>();
/** Result of the last triangle lookup (plain numbers, reused by every query: no allocation per call). */
const terrainTriangleLookup: ITerrainTriangleLookup = { height: 0, triangleB: false, h00: 0, h10: 0, h01: 0, h11: 0 };

let terrainPickRay: Nullable<Ray> = null;

/**
 * World height (cm) of the rendered terrain surface under world (x, z); null outside the terrain, over a hole, or when mesh is not a terrain.
 * Instances of a terrain are terrains too (their source mesh is a terrain). The heightfield is cached at the first call and rebuilt when the
 * position data or the index array of the geometry is replaced; call invalidateTerrainHeightCache after editing them in place (§6.7.1).
 */
export function getTerrainHeightAtCoordinates(mesh: AbstractMesh, x: number, z: number): number | null {
	return locateTerrainSurface(mesh, x, z, null);
}

/** World normal of the surface under world (x, z) written into result; false (result untouched) when getTerrainHeightAtCoordinates would return null. */
export function getTerrainNormalAtCoordinatesToRef(mesh: AbstractMesh, x: number, z: number, result: Vector3): boolean {
	return locateTerrainSurface(mesh, x, z, result) !== null;
}

/** Drops the cached heightfield of mesh (call after changing its vertex data in place at runtime). */
export function invalidateTerrainHeightCache(mesh: AbstractMesh): void {
	terrainHeightTransforms.delete(mesh);

	const vertexBuffer = getTerrainGeometryOwner(mesh).getVertexBuffer(VertexBuffer.PositionKind);
	if (vertexBuffer) {
		terrainHeightFields.delete(vertexBuffer);
	}
}

/** Returns the world height under (x, z) and writes the world normal into normal when given; null when there is no terrain surface there. */
function locateTerrainSurface(mesh: AbstractMesh, x: number, z: number, normal: Nullable<Vector3>): number | null {
	const owner = getTerrainGeometryOwner(mesh);
	if (!isTerrainMesh(owner)) {
		return null;
	}

	const field = getTerrainHeightField(owner);
	if (!field) {
		return null;
	}

	const transform = getTerrainHeightTransform(mesh);
	if (!transform.valid) {
		return null;
	}

	const y = transform.tilted ? locateTiltedTerrainSurface(mesh, field, transform, x, z) : locateVerticalTerrainSurface(field, transform, x, z);
	if (y === null || !Number.isFinite(y)) {
		return null;
	}

	if (normal) {
		writeTerrainWorldNormal(field, transform, normal);
	}

	return y;
}

/** Instances read the geometry of their source mesh. */
function getTerrainGeometryOwner(mesh: AbstractMesh): AbstractMesh {
	if (mesh.getClassName() === "InstancedMesh") {
		return (mesh as InstancedMesh).sourceMesh ?? mesh;
	}

	return mesh;
}

function getTerrainHeightField(owner: AbstractMesh): ITerrainHeightField | null {
	const vertexBuffer = owner.getVertexBuffer(VertexBuffer.PositionKind);
	const positions = vertexBuffer?.getData();
	if (!vertexBuffer || !positions) {
		return null;
	}

	const indices = owner.getIndices();

	let entry = terrainHeightFields.get(vertexBuffer);
	if (!entry || entry.positions !== positions || entry.indices !== indices) {
		entry = {
			positions,
			indices,
			field: buildTerrainHeightField(owner.getVerticesData(VertexBuffer.PositionKind), indices),
		};

		terrainHeightFields.set(vertexBuffer, entry);
	}

	return entry.field;
}

function buildTerrainHeightField(positions: Nullable<FloatArray>, indices: Nullable<IndicesArray>): ITerrainHeightField | null {
	if (!positions) {
		return null;
	}

	const vertexCount = positions.length / 3;
	const side = Math.round(Math.sqrt(vertexCount));
	if (side * side !== vertexCount || side < 2) {
		return null;
	}

	const subdivisions = side - 1;

	// Same extents as repairTerrainGroundMesh (§6.7): row 0 is the +Z edge, row S the -Z edge.
	const minX = positions[0];
	const maxX = positions[3 * subdivisions];
	const maxZ = positions[2];
	const minZ = positions[3 * subdivisions * side + 2];

	const width = maxX - minX;
	const height = maxZ - minZ;
	if (!(width > 0 && height > 0)) {
		return null;
	}

	const heights = new Float32Array(vertexCount);

	let minHeight = Number.POSITIVE_INFINITY;
	let maxHeight = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < vertexCount; ++i) {
		heights[i] = positions[3 * i + 1];

		const h = heights[i];
		if (h < minHeight) {
			minHeight = h;
		}
		if (h > maxHeight) {
			maxHeight = h;
		}
	}

	if (!(minHeight <= maxHeight)) {
		minHeight = 0;
		maxHeight = 0;
	}

	return {
		subdivisions,
		minX,
		maxX,
		minZ,
		maxZ,
		cellX: width / subdivisions,
		cellZ: height / subdivisions,
		heights,
		minHeight,
		maxHeight,
		triangles: indices && indices.length !== 6 * subdivisions * subdivisions ? buildTerrainTriangleMask(indices, subdivisions) : null,
	};
}

/** §4.6: a triangle belongs to the quad of its smallest vertex index; it is A when it contains vertex (qr, qc+1), B when it contains (qr+1, qc). */
function buildTerrainTriangleMask(indices: IndicesArray, subdivisions: number): Uint8Array {
	const side = subdivisions + 1;
	const mask = new Uint8Array(subdivisions * subdivisions);

	for (let t = 0; t + 2 < indices.length; t += 3) {
		const i0 = indices[t];
		const i1 = indices[t + 1];
		const i2 = indices[t + 2];

		const first = Math.min(i0, i1, i2);
		const row = Math.floor(first / side);
		const column = first - row * side;
		if (row >= subdivisions || column >= subdivisions) {
			continue;
		}

		const quad = row * subdivisions + column;

		const a = first + 1;
		const b = first + side;
		if (i0 === a || i1 === a || i2 === a) {
			mask[quad] |= 1;
		} else if (i0 === b || i1 === b || i2 === b) {
			mask[quad] |= 2;
		}
	}

	return mask;
}

function getTerrainHeightTransform(mesh: AbstractMesh): ITerrainHeightTransform {
	const matrix = mesh.getWorldMatrix();

	let transform = terrainHeightTransforms.get(mesh);
	if (transform && transform.matrix === matrix && transform.updateFlag === matrix.updateFlag) {
		return transform;
	}

	if (!transform || transform.matrix !== matrix) {
		transform = {
			matrix,
			updateFlag: matrix.updateFlag,
			valid: false,
			tilted: false,
			world: new Float64Array(12),
			inverse: new Float64Array(9),
		};

		terrainHeightTransforms.set(mesh, transform);
	}

	updateTerrainHeightTransform(transform);

	return transform;
}

function updateTerrainHeightTransform(transform: ITerrainHeightTransform): void {
	const m = transform.matrix.m;
	const w = transform.world;

	w[0] = m[0];
	w[1] = m[1];
	w[2] = m[2];
	w[3] = m[4];
	w[4] = m[5];
	w[5] = m[6];
	w[6] = m[8];
	w[7] = m[9];
	w[8] = m[10];
	w[9] = m[12];
	w[10] = m[13];
	w[11] = m[14];

	transform.updateFlag = transform.matrix.updateFlag;

	// Metric (§4): lengths of the rows, exactly as Matrix.decompose reads them.
	const sx = Math.hypot(w[0], w[1], w[2]);
	const sy = Math.hypot(w[3], w[4], w[5]);
	const sz = Math.hypot(w[6], w[7], w[8]);

	// Inverse of the linear part through the adjugate, in double precision (the matrix itself is stored in float32).
	const c00 = w[4] * w[8] - w[5] * w[7];
	const c01 = w[5] * w[6] - w[3] * w[8];
	const c02 = w[3] * w[7] - w[4] * w[6];
	const determinant = w[0] * c00 + w[1] * c01 + w[2] * c02;

	transform.valid =
		sx >= TERRAIN_HEIGHT_MIN_SCALE &&
		sy >= TERRAIN_HEIGHT_MIN_SCALE &&
		sz >= TERRAIN_HEIGHT_MIN_SCALE &&
		Number.isFinite(determinant) &&
		Math.abs(determinant) > TERRAIN_HEIGHT_MIN_SCALE * sx * sy * sz;

	if (!transform.valid) {
		transform.tilted = false;
		return;
	}

	const inverse = transform.inverse;
	const scale = 1 / determinant;

	inverse[0] = c00 * scale;
	inverse[1] = (w[2] * w[7] - w[1] * w[8]) * scale;
	inverse[2] = (w[1] * w[5] - w[2] * w[4]) * scale;
	inverse[3] = c01 * scale;
	inverse[4] = (w[0] * w[8] - w[2] * w[6]) * scale;
	inverse[5] = (w[2] * w[3] - w[0] * w[5]) * scale;
	inverse[6] = c02 * scale;
	inverse[7] = (w[1] * w[6] - w[0] * w[7]) * scale;
	inverse[8] = (w[0] * w[4] - w[1] * w[3]) * scale;

	transform.tilted = !(Math.abs(w[3]) < TERRAIN_HEIGHT_TILT_TOLERANCE * sy && Math.abs(w[5]) < TERRAIN_HEIGHT_TILT_TOLERANCE * sy);
}

/**
 * Local Y axis world-vertical (§6.7.1): world (x, 0, z) is brought to local space, the height is interpolated there (§4.1) and the local point
 * (lx, h, lz) is transformed back by the world matrix (sheared matrices included). A slightly tilted axis (below the tilt tolerance) follows the world vertical.
 */
function locateVerticalTerrainSurface(field: ITerrainHeightField, transform: ITerrainHeightTransform, x: number, z: number): number | null {
	const w = transform.world;
	const inverse = transform.inverse;

	const dx = x - w[9];
	const dy = -w[10];
	const dz = z - w[11];

	// local = (world - translation) x inverse (row vectors).
	const ox = dx * inverse[0] + dy * inverse[3] + dz * inverse[6];
	const oy = dx * inverse[1] + dy * inverse[4] + dz * inverse[7];
	const oz = dx * inverse[2] + dy * inverse[5] + dz * inverse[8];

	let px = ox;
	let pz = oz;

	// Local direction of the world +Y axis (row 1 of the inverse): exactly the local Y axis when m[4] = m[6] = 0.
	const ux = inverse[3];
	const uy = inverse[4];
	const uz = inverse[5];

	if ((ux !== 0 || uz !== 0) && uy !== 0) {
		for (let i = 0; i < TERRAIN_HEIGHT_VERTICAL_ITERATIONS; ++i) {
			locateTerrainTriangle(field, px, pz, true, true);

			const s = (terrainTriangleLookup.height - oy) / uy;
			px = ox + s * ux;
			pz = oz + s * uz;
		}
	}

	if (!locateTerrainTriangle(field, px, pz, false, false)) {
		return null;
	}

	return px * w[1] + terrainTriangleLookup.height * w[4] + pz * w[7] + w[10];
}

/** Tilted terrains (§6.7.1): vertical pick from above the terrain's world bounds, restricted to the mesh (removed triangles are never hit). */
function locateTiltedTerrainSurface(mesh: AbstractMesh, field: ITerrainHeightField, transform: ITerrainHeightTransform, x: number, z: number): number | null {
	const w = transform.world;

	// World Y range of the local box [minX, maxX] x [minHeight, maxHeight] x [minZ, maxZ]: each local axis contributes independently.
	const yx0 = field.minX * w[1];
	const yx1 = field.maxX * w[1];
	const yh0 = field.minHeight * w[4];
	const yh1 = field.maxHeight * w[4];
	const yz0 = field.minZ * w[7];
	const yz1 = field.maxZ * w[7];

	const top = w[10] + Math.max(yx0, yx1) + Math.max(yh0, yh1) + Math.max(yz0, yz1);
	const bottom = w[10] + Math.min(yx0, yx1) + Math.min(yh0, yh1) + Math.min(yz0, yz1);
	const margin = 1 + (top - bottom) * 1e-3;

	terrainPickRay ??= new Ray(new Vector3(0, 0, 0), new Vector3(0, -1, 0), 1);
	terrainPickRay.origin.set(x, top + margin, z);
	terrainPickRay.direction.set(0, -1, 0);
	terrainPickRay.length = top - bottom + 2 * margin;

	// Babylon tests the triangles of sub-meshes that have a material (as every rendered terrain has); without one it reports
	// a bounding-box hit without a picked point, which is treated as a miss.
	const pickingInfo = mesh.getScene().pickWithRay(terrainPickRay, (candidate) => candidate === mesh);
	const point = pickingInfo?.hit ? pickingInfo.pickedPoint : null;
	if (!point) {
		return null;
	}

	// Triangle under the hit, for the normal.
	const inverse = transform.inverse;
	const dx = point.x - w[9];
	const dy = point.y - w[10];
	const dz = point.z - w[11];

	locateTerrainTriangle(field, dx * inverse[0] + dy * inverse[3] + dz * inverse[6], dx * inverse[2] + dy * inverse[5] + dz * inverse[8], true, true);

	return point.y;
}

/**
 * Finds the triangle of the local point (px, pz) and interpolates its height with the two-triangle rule of §4.1 into terrainTriangleLookup.
 * false outside the grid rectangle (unless clampToGrid) or over a missing triangle (unless ignoreHoles).
 */
function locateTerrainTriangle(field: ITerrainHeightField, px: number, pz: number, clampToGrid: boolean, ignoreHoles: boolean): boolean {
	const subdivisions = field.subdivisions;

	let column = (px - field.minX) / field.cellX;
	let row = (field.maxZ - pz) / field.cellZ;

	if (
		!clampToGrid &&
		!(
			column >= -TERRAIN_HEIGHT_EDGE_TOLERANCE &&
			column <= subdivisions + TERRAIN_HEIGHT_EDGE_TOLERANCE &&
			row >= -TERRAIN_HEIGHT_EDGE_TOLERANCE &&
			row <= subdivisions + TERRAIN_HEIGHT_EDGE_TOLERANCE
		)
	) {
		return false;
	}

	column = Math.min(Math.max(column, 0), subdivisions);
	row = Math.min(Math.max(row, 0), subdivisions);

	const quadColumn = Math.min(Math.floor(column), subdivisions - 1);
	const quadRow = Math.min(Math.floor(row), subdivisions - 1);

	const fx = column - quadColumn;
	const fz = row - quadRow;
	const triangleB = fz > fx;

	if (!ignoreHoles && field.triangles && (field.triangles[quadRow * subdivisions + quadColumn] & (triangleB ? 2 : 1)) === 0) {
		return false;
	}

	const heights = field.heights;
	const i00 = quadRow * (subdivisions + 1) + quadColumn;

	const h00 = heights[i00];
	const h10 = heights[i00 + 1];
	const h01 = heights[i00 + subdivisions + 1];
	const h11 = heights[i00 + subdivisions + 2];

	const lookup = terrainTriangleLookup;
	lookup.triangleB = triangleB;
	lookup.h00 = h00;
	lookup.h10 = h10;
	lookup.h01 = h01;
	lookup.h11 = h11;
	lookup.height = triangleB ? h00 + (h01 - h00) * fz + (h11 - h01) * fx : h00 + (h10 - h00) * fx + (h11 - h10) * fz;

	return true;
}

/** Normal of the looked-up triangle oriented to local +Y (n_up of §4.8), transformed by the normal matrix (inverse transpose) and normalized. */
function writeTerrainWorldNormal(field: ITerrainHeightField, transform: ITerrainHeightTransform, result: Vector3): void {
	const lookup = terrainTriangleLookup;

	const nx = lookup.triangleB ? -(lookup.h11 - lookup.h01) / field.cellX : -(lookup.h10 - lookup.h00) / field.cellX;
	const nz = lookup.triangleB ? (lookup.h01 - lookup.h00) / field.cellZ : (lookup.h11 - lookup.h10) / field.cellZ;

	// world = local x transpose(inverse) (row vectors); ny = 1.
	const inverse = transform.inverse;
	const wx = nx * inverse[0] + inverse[1] + nz * inverse[2];
	const wy = nx * inverse[3] + inverse[4] + nz * inverse[5];
	const wz = nx * inverse[6] + inverse[7] + nz * inverse[8];

	const length = Math.sqrt(wx * wx + wy * wy + wz * wz);

	result.set(wx / length, wy / length, wz / length);
}
