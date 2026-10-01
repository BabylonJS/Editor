import { Vector3, VertexBuffer, Geometry, IndicesArray, Mesh } from "babylonjs";

import { isTerrainMesh } from "../../guards/nodes";

import { computeTerrainNormals } from "../core/normals";
import { buildTerrainIndices, countTerrainHoles, terrainHolesFromIndices } from "../core/holes";
import { ITerrainGrid, ITerrainRect, ITerrainTileResource, TerrainResourceKind } from "../core/types";
import { buildTerrainPositions, buildTerrainUVs, computeTerrainHeightRange, extractTerrainHeights, writeTerrainHeightsToPositions } from "../core/heightfield";

import { getTerrainIndexRebuildIntervalMs, rebuildTerrainIndexBuffer, TERRAIN_VERTEX_UPLOAD_BUDGET_BYTES, TerrainDirtyRows, uploadTerrainVertexRows } from "./gpu";

/**
 * Maximum number of disjoint dirty height rects kept between two flushes. Symmetric strokes write far-apart regions: one union rect would
 * make every flush rewrite (and recompute the normals of) the whole area between them.
 */
export const TERRAIN_MAX_DIRTY_HEIGHT_RECTS = 8;

export interface ITerrainGeometryFlushOptions {
	/** Upload budget in bytes for positions + normals (default TERRAIN_VERTEX_UPLOAD_BUDGET_BYTES = 8 MB); Infinity uploads every pending row. */
	uploadBudgetBytes?: number;
	/** Clock of the index rebuild throttle (default performance.now()). */
	nowMs?: number;
	/** Rebuilds the index buffer now when holes changed, whatever the throttle. */
	forceIndices?: boolean;
}

export interface ITerrainGeometryFlushResult {
	/** True when dirty heights were written to the positions and normals (CPU). */
	heightsWritten: boolean;
	/** Bytes sent to the GPU (positions + normals). */
	uploadedBytes: number;
	/** Rows still waiting for their upload (budget exceeded). */
	pendingRows: number;
	/** True when the index buffer was rebuilt from the hole mask. */
	indicesRebuilt: boolean;
	/** True when the bounding box was enlarged (the height range grew beyond it). */
	boundsGrown: boolean;
}

export interface ITerrainGeometryFinalizeOptions {
	/** Finalizes the heights (exact range, bounding info, GroundMesh height quads, collider caches). */
	heights?: boolean;
	/** Finalizes the holes (final index rebuild, bounding info). */
	holes?: boolean;
}

/**
 * Geometry binding of a terrain (§6.1): created at the first edit, it owns the positions and normals (updatable vertex buffers whose
 * Buffer._data IS the owned array, so serialization always sees live data), the compact heightfield (S+1)² and the hole mask S².
 * Kernels write heights and holes; `markDirty` records the rects; `flush` writes heights to positions, recomputes the normals of rect ⊕ 1,
 * uploads contiguous row bands with updateDynamicVertexBuffer (≤ 8 MB per frame), grows the bounds and rebuilds the index buffer (throttled);
 * `finalize` makes everything exact at the end of a stroke, an undo or an operation.
 */
export class TerrainGeometryBinding {
	public readonly mesh: Mesh;
	public readonly geometry: Geometry;
	public readonly grid: ITerrainGrid;
	/** (S+1)² × 3 local positions: the data of the updatable position buffer. */
	public readonly positions: Float32Array;
	/** (S+1)² × 3 local normals: the data of the updatable normal buffer. */
	public readonly normals: Float32Array;
	/** (S+1)² local heights, row 0 = +Z edge. */
	public readonly heights: Float32Array;
	/** S² quads, 1 = hole. */
	public readonly holes: Uint8Array;
	/** Local height range: exact after creation and finalize, conservative (only grows) between them. */
	public readonly heightRange: { min: number; max: number };

	private readonly _positionBuffer: VertexBuffer;
	private readonly _normalBuffer: VertexBuffer;
	private readonly _rows: TerrainDirtyRows;
	private readonly _heightsResource: ITerrainTileResource;
	private readonly _holesResource: ITerrainTileResource;

	private _indices: IndicesArray | null;
	private _dirtyHeights: ITerrainRect[] = [];
	private _holesDirty: boolean = false;
	private _lastIndexRebuildMs: number = -Infinity;
	private _heightsChanged: boolean = false;
	private _holesChanged: boolean = false;
	private _disposed: boolean = false;

	private _holesRevision: number = 0;
	private _holeCount: number = 0;
	private _holeCountRevision: number = -1;

	private constructor(mesh: Mesh, grid: ITerrainGrid, positions: Float32Array, normals: Float32Array, heights: Float32Array, holes: Uint8Array) {
		const geometry = mesh.geometry;
		const positionBuffer = mesh.getVertexBuffer(VertexBuffer.PositionKind);
		const normalBuffer = mesh.getVertexBuffer(VertexBuffer.NormalKind);
		if (!geometry || !positionBuffer || !normalBuffer) {
			throw new Error("terrain: the terrain geometry has no position or normal buffer");
		}

		this.mesh = mesh;
		this.geometry = geometry;
		this.grid = grid;
		this.positions = positions;
		this.normals = normals;
		this.heights = heights;
		this.holes = holes;

		const range = computeTerrainHeightRange(heights, grid);
		this.heightRange = { min: range.min, max: range.max };

		this._positionBuffer = positionBuffer;
		this._normalBuffer = normalBuffer;
		this._indices = geometry.getIndices();
		this._rows = new TerrainDirtyRows(grid.rows);

		this._heightsResource = { kind: "heights", width: grid.columns, height: grid.rows, channels: 1, data: heights };
		this._holesResource = { kind: "holes", width: grid.subdivisions, height: grid.subdivisions, channels: 1, data: holes };
	}

	/**
	 * Binds an existing grid geometry (first edit, §6.1 step 2-3): copies the positions and normals (normals computed with §4.7 when absent),
	 * re-sets them as UPDATABLE buffers holding the copies, and extracts the heights and the hole mask (§4.6). UVs and indices keep their
	 * buffers (canonical indices are created when the geometry has none). The caller checks sharing and eligibility first (registry).
	 * @param mesh defines the reference to the terrain mesh.
	 * @param grid defines the grid inferred from its positions.
	 */
	public static Create(mesh: Mesh, grid: ITerrainGrid): TerrainGeometryBinding {
		const vertexCount = grid.columns * grid.rows;

		const sourcePositions = mesh.getVerticesData(VertexBuffer.PositionKind);
		if (!sourcePositions || sourcePositions.length !== vertexCount * 3) {
			throw new Error("terrain: the geometry doesn't match the terrain grid");
		}

		const positions = new Float32Array(sourcePositions);
		const heights = extractTerrainHeights(positions, grid);

		let normals: Float32Array;
		const sourceNormals = mesh.getVerticesData(VertexBuffer.NormalKind);
		if (sourceNormals && sourceNormals.length === positions.length) {
			normals = new Float32Array(sourceNormals);
		} else {
			normals = new Float32Array(positions.length);
			computeTerrainNormals(heights, grid, getFullVertexRect(grid), normals);
		}

		const indices = mesh.getIndices();
		const holes = indices ? terrainHolesFromIndices(grid, indices).holes : new Uint8Array(grid.subdivisions * grid.subdivisions);

		mesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
		mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);

		if (!indices) {
			mesh.setIndices(buildTerrainIndices(grid, holes), vertexCount, true);
		}

		return new TerrainGeometryBinding(mesh, grid, positions, normals, heights, holes);
	}

	/**
	 * Replaces the vertex data of the terrain by a grid (creation, resize, resample; §6.12 step 4): owned UPDATABLE positions (§4.1
	 * grid with the heights), normals (§4.7) and UVs (c/S, 1 - r/S), canonical indices without the hole quads (§4.6); then the GroundMesh
	 * internals (setTerrainGroundInternals) and an exact bounding refresh. `heights` and `holes` are owned by the new binding (not copied). Other
	 * vertex kinds (uv2, colors...) are left untouched: the resize removes them (and keeps them for undo) before calling this.
	 * @param mesh defines the reference to the terrain mesh.
	 * @param grid defines the new grid.
	 * @param heights defines the (S+1)² local heights (row 0 = +Z edge).
	 * @param holes defines the S² hole mask (null = no hole).
	 */
	public static Install(mesh: Mesh, grid: ITerrainGrid, heights: Float32Array, holes: Uint8Array | null): TerrainGeometryBinding {
		const vertexCount = grid.columns * grid.rows;
		if (heights.length !== vertexCount) {
			throw new Error("terrain: the heights don't match the terrain grid");
		}

		const holeMask = holes ?? new Uint8Array(grid.subdivisions * grid.subdivisions);
		if (holeMask.length !== grid.subdivisions * grid.subdivisions) {
			throw new Error("terrain: the hole mask doesn't match the terrain grid");
		}

		const positions = buildTerrainPositions(heights, grid);
		const normals = new Float32Array(vertexCount * 3);
		computeTerrainNormals(heights, grid, getFullVertexRect(grid), normals);

		mesh.setVerticesData(VertexBuffer.PositionKind, positions, true);
		mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);
		mesh.setVerticesData(VertexBuffer.UVKind, buildTerrainUVs(grid), true);
		mesh.setIndices(buildTerrainIndices(grid, holeMask), vertexCount, true);

		setTerrainGroundInternals(mesh, grid);

		const binding = new TerrainGeometryBinding(mesh, grid, positions, normals, heights, holeMask);
		binding._refreshBounds();

		return binding;
	}

	/**
	 * False when the mesh was disposed or its geometry was replaced by something other than this binding (another geometry, position,
	 * normal or index buffer, §6.1 step 4): the registry then drops the binding and rebuilds it lazily.
	 */
	public get isValid(): boolean {
		if (this._disposed || this.mesh.isDisposed() || this.mesh.geometry !== this.geometry) {
			return false;
		}

		const positionBuffer = this.mesh.getVertexBuffer(VertexBuffer.PositionKind);
		const normalBuffer = this.mesh.getVertexBuffer(VertexBuffer.NormalKind);

		return (
			positionBuffer === this._positionBuffer &&
			positionBuffer.getData() === this.positions &&
			normalBuffer === this._normalBuffer &&
			normalBuffer.getData() === this.normals &&
			this.geometry.getIndices() === this._indices
		);
	}

	/** True while heights, uploads or an index rebuild wait for a flush. */
	public get hasPendingWork(): boolean {
		return this._dirtyHeights.length > 0 || !this._rows.isEmpty || this._holesDirty;
	}

	/** True when heights or holes changed since the last finalize. */
	public get needsFinalize(): boolean {
		return this._heightsChanged || this._holesChanged;
	}

	/**
	 * Revision of the hole mask: incremented by every markDirty("holes") with a non-empty rect (markAllDirty goes through it) and by every
	 * finalize of the holes. Every writer of `holes` marks what it wrote (strokes, operations, undo/redo, restores) or finalizes it.
	 */
	public get holesRevision(): number {
		return this._holesRevision;
	}

	/** Number of hole quads, counted (O(S²)) at most once per holesRevision (getTerrainMeshInfo reads it at every terrain change). */
	public get holeCount(): number {
		if (this._holeCountRevision !== this._holesRevision) {
			this._holeCount = countTerrainHoles(this.holes);
			this._holeCountRevision = this._holesRevision;
		}

		return this._holeCount;
	}

	/** CPU bytes owned by the binding (positions, normals, heights, holes). */
	public get cpuBytes(): number {
		return this.positions.byteLength + this.normals.byteLength + this.heights.byteLength + this.holes.byteLength;
	}

	/**
	 * Live resource of the undo journal (§7.1): heights (vertices, (S+1)², 1 float) or holes (quads, S², 1 byte); null for weights.
	 * @param kind defines the resource kind.
	 */
	public getResource(kind: TerrainResourceKind): ITerrainTileResource | null {
		switch (kind) {
			case "heights":
				return this._heightsResource;
			case "holes":
				return this._holesResource;
			default:
				return null;
		}
	}

	/**
	 * Records a changed rect: vertex rect for heights, quad rect for holes (clamped to the grid; weights are ignored here).
	 * @param kind defines the resource kind.
	 * @param rect defines the inclusive rect.
	 */
	public markDirty(kind: TerrainResourceKind, rect: ITerrainRect): void {
		if (kind === "heights") {
			const clamped = clampRect(rect, this.grid.columns, this.grid.rows);
			if (clamped) {
				addDirtyRect(this._dirtyHeights, clamped);
				this._heightsChanged = true;
			}
		} else if (kind === "holes") {
			const clamped = clampRect(rect, this.grid.subdivisions, this.grid.subdivisions);
			if (clamped) {
				this._holesDirty = true;
				this._holesChanged = true;
				++this._holesRevision;
			}
		}
	}

	/**
	 * Marks every element of a resource dirty (whole-terrain operations, undo of full payloads).
	 * @param kind defines the resource kind (heights or holes).
	 */
	public markAllDirty(kind: TerrainResourceKind): void {
		this.markDirty(kind, kind === "holes" ? { x0: 0, y0: 0, x1: this.grid.subdivisions - 1, y1: this.grid.subdivisions - 1 } : getFullVertexRect(this.grid));
	}

	/**
	 * Frame flush (§6.1): dirty heights → positions, normals over rect ⊕ 1, conservative bounds growth, row-band uploads within the budget
	 * (the CPU state is always exact, the rest of the rows upload at the next flush), throttled index rebuild when holes changed.
	 * @param options defines the budget, the clock and whether the index rebuild is forced.
	 */
	public flush(options: ITerrainGeometryFlushOptions = {}): ITerrainGeometryFlushResult {
		const result: ITerrainGeometryFlushResult = {
			heightsWritten: false,
			uploadedBytes: 0,
			pendingRows: this._rows.count,
			indicesRebuilt: false,
			boundsGrown: false,
		};

		if (!this.isValid) {
			return result;
		}

		if (this._dirtyHeights.length) {
			const rects = this._dirtyHeights;
			this._dirtyHeights = [];

			let min = Infinity;
			let max = -Infinity;

			for (const dirty of rects) {
				writeTerrainHeightsToPositions(this.heights, this.grid, dirty, this.positions);
				const normalsRect = computeTerrainNormals(this.heights, this.grid, dirty, this.normals);

				this._rows.mark(Math.min(dirty.y0, normalsRect.y0), Math.max(dirty.y1, normalsRect.y1));

				const range = computeTerrainHeightRange(this.heights, this.grid, dirty);
				min = Math.min(min, range.min);
				max = Math.max(max, range.max);
			}

			this.heightRange.min = Math.min(this.heightRange.min, min);
			this.heightRange.max = Math.max(this.heightRange.max, max);

			result.heightsWritten = true;
			result.boundsGrown = this._growBounds(min, max);
		}

		if (!this._rows.isEmpty) {
			const rowFloats = this.grid.columns * 3;
			const bytesPerRow = rowFloats * Float32Array.BYTES_PER_ELEMENT * 2;
			const budget = options.uploadBudgetBytes ?? TERRAIN_VERTEX_UPLOAD_BUDGET_BYTES;
			const maxRows = budget === Infinity ? Infinity : Math.max(1, Math.floor(budget / bytesPerRow));

			for (const band of this._rows.take(maxRows)) {
				result.uploadedBytes += uploadTerrainVertexRows(this.mesh, VertexBuffer.PositionKind, this.positions, band.first, band.last, rowFloats);
				result.uploadedBytes += uploadTerrainVertexRows(this.mesh, VertexBuffer.NormalKind, this.normals, band.first, band.last, rowFloats);
			}
		}

		result.pendingRows = this._rows.count;

		if (this._holesDirty) {
			const now = options.nowMs ?? performance.now();
			if (options.forceIndices || now - this._lastIndexRebuildMs >= getTerrainIndexRebuildIntervalMs(this.grid.subdivisions)) {
				this._indices = rebuildTerrainIndexBuffer(this.mesh, this.grid, this.holes);
				this._lastIndexRebuildMs = now;
				this._holesDirty = false;
				result.indicesRebuilt = true;
			}
		}

		return result;
	}

	/**
	 * Finalization (stroke end, undo/redo, operations; §6.1): flushes everything (no budget, forced index rebuild), then for heights the exact
	 * height range, mesh.refreshBoundingInfo({ updatePositionsArray: true }) (positions used by Babylon picking and collisions), the instances'
	 * bounding infos, GroundMesh._heightQuads = [] (lazy) and the collider caches; for holes the final index rebuild and the same bounding
	 * refresh. Without options, finalizes the kinds changed since the last finalize. A kind requested explicitly but never marked dirty (the
	 * arrays were written directly) is processed whole. Returns the finalized kinds.
	 * @param options defines the kinds to finalize.
	 */
	public finalize(options?: ITerrainGeometryFinalizeOptions): ("heights" | "holes")[] {
		const heights = options ? !!options.heights : this._heightsChanged;
		const holes = options ? !!options.holes : this._holesChanged;

		if (!this.isValid) {
			return [];
		}

		if (heights && !this._heightsChanged) {
			this.markAllDirty("heights");
		}

		if (holes && !this._holesChanged) {
			this.markAllDirty("holes");
		}

		this.flush({ uploadBudgetBytes: Infinity, forceIndices: true });

		const kinds: ("heights" | "holes")[] = [];

		if (heights) {
			const range = computeTerrainHeightRange(this.heights, this.grid);
			this.heightRange.min = range.min;
			this.heightRange.max = range.max;

			this._heightsChanged = false;
			kinds.push("heights");
		}

		if (holes) {
			// The finalized holes may include writes that were never marked: the hole count is taken again.
			++this._holesRevision;
			this._holesChanged = false;
			kinds.push("holes");
		}

		if (kinds.length) {
			this._refreshBounds();
		}

		return kinds;
	}

	/** Detaches the binding (the registry dropped it); the vertex buffers are left as they are. */
	public dispose(): void {
		this._disposed = true;
		this._rows.clear();
		this._dirtyHeights = [];
		this._holesDirty = false;
	}

	/** Exact bounding refresh of the mesh and its instances, GroundMesh height quads and collider caches reset. */
	private _refreshBounds(): void {
		this.mesh.refreshBoundingInfo({ updatePositionsArray: true });

		const box = this.mesh.getBoundingInfo().boundingBox;
		for (const instance of this.mesh.instances) {
			const info = instance.getBoundingInfo();
			if (!info.isLocked) {
				info.reConstruct(box.minimum, box.maximum, instance.getWorldMatrix());
			}
		}

		if (isTerrainMesh(this.mesh)) {
			(this.mesh as any)._heightQuads = [];
		}

		for (const subMesh of this.mesh.subMeshes ?? []) {
			(subMesh as any)._lastColliderWorldVertices = null;
		}
	}

	/** Enlarges the bounding boxes (mesh and instances) along Y when the heights leave them, so frustum culling never hides raised ground. */
	private _growBounds(min: number, max: number): boolean {
		if (!this.mesh.hasBoundingInfo) {
			return false;
		}

		const info = this.mesh.getBoundingInfo();
		const box = info.boundingBox;
		if (info.isLocked || (min >= box.minimum.y && max <= box.maximum.y)) {
			return false;
		}

		const minimum = new Vector3(box.minimum.x, Math.min(box.minimum.y, min), box.minimum.z);
		const maximum = new Vector3(box.maximum.x, Math.max(box.maximum.y, max), box.maximum.z);

		info.reConstruct(minimum, maximum, this.mesh.getWorldMatrix());

		for (const instance of this.mesh.instances) {
			const instanceInfo = instance.getBoundingInfo();
			if (!instanceInfo.isLocked) {
				instanceInfo.reConstruct(minimum, maximum, instance.getWorldMatrix());
			}
		}

		return true;
	}
}

/**
 * Inclusive rect of every vertex of the grid.
 * @param grid defines the grid.
 */
export function getFullVertexRect(grid: ITerrainGrid): ITerrainRect {
	return { x0: 0, y0: 0, x1: grid.columns - 1, y1: grid.rows - 1 };
}

function clampRect(rect: ITerrainRect, width: number, height: number): ITerrainRect | null {
	const x0 = Math.max(0, Math.floor(rect.x0));
	const y0 = Math.max(0, Math.floor(rect.y0));
	const x1 = Math.min(width - 1, Math.ceil(rect.x1));
	const y1 = Math.min(height - 1, Math.ceil(rect.y1));

	return x1 < x0 || y1 < y0 ? null : { x0, y0, x1, y1 };
}

function unionRect(a: ITerrainRect, b: ITerrainRect): ITerrainRect {
	return {
		x0: Math.min(a.x0, b.x0),
		y0: Math.min(a.y0, b.y0),
		x1: Math.max(a.x1, b.x1),
		y1: Math.max(a.y1, b.y1),
	};
}

function getRectArea(rect: ITerrainRect): number {
	return (rect.x1 - rect.x0 + 1) * (rect.y1 - rect.y0 + 1);
}

/** True when the rects overlap or touch (their union then costs nothing more than both). */
function areRectsAdjacent(a: ITerrainRect, b: ITerrainRect): boolean {
	return a.x0 <= b.x1 + 1 && b.x0 <= a.x1 + 1 && a.y0 <= b.y1 + 1 && b.y0 <= a.y1 + 1;
}

/**
 * Adds a rect to a list of disjoint dirty rects: merged with every rect it overlaps or touches; when the list exceeds
 * TERRAIN_MAX_DIRTY_HEIGHT_RECTS, the pair whose union adds the least area is merged.
 */
function addDirtyRect(rects: ITerrainRect[], rect: ITerrainRect): void {
	let merged = { x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1 };

	for (let i = rects.length - 1; i >= 0; --i) {
		if (areRectsAdjacent(rects[i], merged)) {
			merged = unionRect(rects[i], merged);
			rects.splice(i, 1);
			i = rects.length;
		}
	}

	rects.push(merged);

	while (rects.length > TERRAIN_MAX_DIRTY_HEIGHT_RECTS) {
		let bestA = 0;
		let bestB = 1;
		let bestCost = Infinity;

		for (let a = 0; a < rects.length; ++a) {
			for (let b = a + 1; b < rects.length; ++b) {
				const cost = getRectArea(unionRect(rects[a], rects[b])) - getRectArea(rects[a]) - getRectArea(rects[b]);
				if (cost < bestCost) {
					bestCost = cost;
					bestA = a;
					bestB = b;
				}
			}
		}

		const union = unionRect(rects[bestA], rects[bestB]);
		rects.splice(bestB, 1);
		rects.splice(bestA, 1);
		addDirtyRect(rects, union);
	}
}

/**
 * GroundMesh internals of a terrain from its (centred, §4.1) grid: exact sizes, saved with the terrain and used as the size hints of
 * inferTerrainGrid, and the height quads that getHeightAtCoordinates recomputes lazily.
 * @param mesh defines the reference to the terrain mesh.
 * @param grid defines its grid.
 */
function setTerrainGroundInternals(mesh: Mesh, grid: ITerrainGrid): void {
	if (!isTerrainMesh(mesh)) {
		return;
	}

	mesh._subdivisionsX = grid.subdivisions;
	mesh._subdivisionsY = grid.subdivisions;
	mesh._width = grid.width;
	mesh._height = grid.height;
	mesh._minX = -grid.width / 2;
	mesh._maxX = grid.width / 2;
	mesh._minZ = -grid.height / 2;
	mesh._maxZ = grid.height / 2;

	(mesh as any)._heightQuads = [];
}
