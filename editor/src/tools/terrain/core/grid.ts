import type { ITerrainGrid, ITerrainRect } from "./types";

/** Relative tolerance under which a size hint (metadata width/height) replaces the size measured from the positions (§4.1). */
const TERRAIN_GRID_HINT_TOLERANCE = 1e-3;

/** Default layout tolerance of `validateTerrainGridLayout`, relative to max(W, H) (§4.1). */
const TERRAIN_GRID_LAYOUT_EPSILON = 1e-3;

/** Number of evenly spaced vertices checked by `validateTerrainGridLayout` besides the four corners (§4.1). */
const TERRAIN_GRID_LAYOUT_SAMPLES = 16;

/**
 * Square vertex grid of a terrain (§4.1).
 *
 * Vertex (c, r), c and r in [0, S]: index r (S + 1) + c, local x = c W / S - W / 2, z = H / 2 - r H / S (row 0 is the +Z edge, column 0
 * the -X edge), UV (c / S, 1 - r / S). The positions are computed with the exact expressions of Babylon's `CreateGroundVertexData`, so a
 * flat grid built from this class is bit-identical to Babylon's.
 */
export class TerrainGrid implements ITerrainGrid {
	/** S (quads per side). */
	public readonly subdivisions: number;
	/** S + 1. */
	public readonly columns: number;
	/** S + 1. */
	public readonly rows: number;
	/** W: local size along X (cm). */
	public readonly width: number;
	/** H: local size along Z (cm). */
	public readonly height: number;
	public readonly cellX: number;
	public readonly cellZ: number;

	private readonly _signature: string;

	/**
	 * @param subdivisions S, an integer >= 1.
	 * @param width W, finite and > 0.
	 * @param height H, finite and > 0.
	 * @throws RangeError when the arguments can't describe a grid.
	 */
	public constructor(subdivisions: number, width: number, height: number) {
		if (!Number.isInteger(subdivisions) || subdivisions < 1) {
			throw new RangeError(`terrain: invalid grid subdivisions ${subdivisions}`);
		}

		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			throw new RangeError(`terrain: invalid grid size ${width} x ${height}`);
		}

		this.subdivisions = subdivisions;
		this.columns = subdivisions + 1;
		this.rows = subdivisions + 1;
		this.width = width;
		this.height = height;
		this.cellX = width / subdivisions;
		this.cellZ = height / subdivisions;

		this._signature = `${subdivisions}:${width}:${height}`;
	}

	/** `${S}:${W}:${H}` */
	public get signature(): string {
		return this._signature;
	}

	public vertexIndex(col: number, row: number): number {
		return row * this.columns + col;
	}

	/** c W / S - W / 2 (Babylon's `CreateGroundVertexData` expression). */
	public localX(col: number): number {
		return (col * this.width) / this.subdivisions - this.width / 2;
	}

	/** H / 2 - r H / S, computed as (S - r) H / S - H / 2 like Babylon's `CreateGroundVertexData`. */
	public localZ(row: number): number {
		return ((this.subdivisions - row) * this.height) / this.subdivisions - this.height / 2;
	}

	/** Fractional column of a local x: (x + W / 2) / cellX (not clamped). */
	public colOf(x: number): number {
		return ((x + this.width / 2) * this.subdivisions) / this.width;
	}

	/** Fractional row of a local z: (H / 2 - z) / cellZ (not clamped). */
	public rowOf(z: number): number {
		return ((this.height / 2 - z) * this.subdivisions) / this.height;
	}

	/** u = (x + W/2) / W, v = (z + H/2) / H (equals the ground UV). */
	public uvOf(x: number, z: number): { u: number; v: number } {
		return {
			u: (x + this.width / 2) / this.width,
			v: (z + this.height / 2) / this.height,
		};
	}

	/** Texel coordinates whose centre is (u, v): tx = u * size - 0.5, ty = v * size - 0.5 (texture order). */
	public texelOf(u: number, v: number, size: number): { tx: number; ty: number } {
		return {
			tx: u * size - 0.5,
			ty: v * size - 0.5,
		};
	}

	/** Local (x, z) of the centre of texel (tx, ty) of a size x size map in texture order: u = (tx + 0.5) / size, x = (u - 0.5) W. */
	public texelToLocal(tx: number, ty: number, size: number): { x: number; z: number } {
		return {
			x: ((tx + 0.5) / size - 0.5) * this.width,
			z: ((ty + 0.5) / size - 0.5) * this.height,
		};
	}

	/** Every vertex: [0, S] x [0, S]. */
	public vertexRect(): ITerrainRect {
		return { x0: 0, y0: 0, x1: this.subdivisions, y1: this.subdivisions };
	}

	/** Every quad: [0, S - 1] x [0, S - 1]. */
	public quadRect(): ITerrainRect {
		return { x0: 0, y0: 0, x1: this.subdivisions - 1, y1: this.subdivisions - 1 };
	}

	/**
	 * Infers S from vertexCount ((S+1)² required), W/H from the position extents (hint used when within 0.1 %); validates the layout.
	 * S always comes from the vertex count (the geometry is the truth); `hint.subdivisions` is informational only.
	 * Returns null when the positions don't describe a centred, row-major (S + 1)² grid (§4.1) or hold a NaN/infinite coordinate.
	 */
	public static FromPositions(positions: ArrayLike<number>, vertexCount: number, hint?: { width?: number; height?: number; subdivisions?: number }): TerrainGrid | null {
		if (!Number.isInteger(vertexCount) || vertexCount < 4 || positions.length < vertexCount * 3) {
			return null;
		}

		const subdivisions = Math.round(Math.sqrt(vertexCount)) - 1;
		if (subdivisions < 1 || (subdivisions + 1) * (subdivisions + 1) !== vertexCount) {
			return null;
		}

		let minX = Infinity;
		let maxX = -Infinity;
		let minZ = Infinity;
		let maxZ = -Infinity;

		for (let i = 0, offset = 0; i < vertexCount; ++i, offset += 3) {
			const x = positions[offset];
			const y = positions[offset + 1];
			const z = positions[offset + 2];

			// NaN or infinite coordinates (v - v is NaN for both): a corrupted geometry is not a grid.
			if (x - x !== 0 || y - y !== 0 || z - z !== 0) {
				return null;
			}

			if (x < minX) {
				minX = x;
			}
			if (x > maxX) {
				maxX = x;
			}
			if (z < minZ) {
				minZ = z;
			}
			if (z > maxZ) {
				maxZ = z;
			}
		}

		let width = maxX - minX;
		let height = maxZ - minZ;
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			return null;
		}

		width = applySizeHint(width, hint?.width);
		height = applySizeHint(height, hint?.height);

		const grid = new TerrainGrid(subdivisions, width, height);
		return validateTerrainGridLayout(positions, grid) ? grid : null;
	}
}

function applySizeHint(measured: number, hint: number | undefined): number {
	if (hint === undefined || !Number.isFinite(hint) || hint <= 0) {
		return measured;
	}

	return Math.abs(hint - measured) <= TERRAIN_GRID_HINT_TOLERANCE * measured ? hint : measured;
}

/**
 * Checks the positions against the §4.1 formulas at the four corners (vertices 0, S, S(S+1), (S+1)² - 1) and at 16 evenly spaced
 * vertices, with the tolerance epsilonRatio x max(W, H) (default 1e-3). Heights (Y) and UVs are not checked.
 */
export function validateTerrainGridLayout(positions: ArrayLike<number>, grid: ITerrainGrid, epsilonRatio?: number): boolean {
	const subdivisions = grid.subdivisions;
	const columns = grid.columns;
	const vertexCount = columns * grid.rows;

	if (positions.length < vertexCount * 3) {
		return false;
	}

	const tolerance = (epsilonRatio ?? TERRAIN_GRID_LAYOUT_EPSILON) * Math.max(grid.width, grid.height);

	const checkVertex = (index: number): boolean => {
		const col = index % columns;
		const row = (index - col) / columns;

		const dx = Math.abs(positions[index * 3] - grid.localX(col));
		const dz = Math.abs(positions[index * 3 + 2] - grid.localZ(row));

		// Written as "<=" so that NaN positions fail.
		return dx <= tolerance && dz <= tolerance;
	};

	const corners = [0, subdivisions, subdivisions * columns, vertexCount - 1];
	for (const index of corners) {
		if (!checkVertex(index)) {
			return false;
		}
	}

	for (let k = 0; k < TERRAIN_GRID_LAYOUT_SAMPLES; ++k) {
		const index = Math.min(vertexCount - 1, Math.floor(((k + 0.5) * vertexCount) / TERRAIN_GRID_LAYOUT_SAMPLES));
		if (!checkVertex(index)) {
			return false;
		}
	}

	return true;
}
