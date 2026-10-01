import type { Mesh } from "babylonjs";
import type { TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { buildTerrainIndices } from "../core/holes";
import type { ITerrainGrid, ITerrainRect } from "../core/types";

/** Vertex upload budget per frame, positions and normals together (§6.1, §7.4): a larger band uploads its first rows, the rest next frame. */
export const TERRAIN_VERTEX_UPLOAD_BUDGET_BYTES = 8 * 1024 * 1024;

/** Dirty row runs separated by at most this many clean rows are uploaded as one band (fewer GPU calls for a few more bytes). */
export const TERRAIN_UPLOAD_ROW_MERGE_GAP = 4;

/** Inclusive range of grid rows. */
export interface ITerrainRowRange {
	first: number;
	last: number;
}

/**
 * Minimum interval between two index buffer rebuilds while holes are painted (§6.1, §7.4): every frame at S <= 256, 100 ms at S <= 512,
 * 250 ms above. Finalization always rebuilds.
 * @param subdivisions defines the subdivisions S of the terrain.
 */
export function getTerrainIndexRebuildIntervalMs(subdivisions: number): number {
	if (subdivisions <= 256) {
		return 0;
	}

	if (subdivisions <= 512) {
		return 100;
	}

	return 250;
}

/**
 * Dirty grid rows of a vertex buffer waiting for their upload. Rows are uploaded as contiguous bands (a row of the grid is contiguous in
 * the row-major vertex arrays), at most a given number of rows per call.
 */
export class TerrainDirtyRows {
	/** Number of rows of the grid (S + 1). */
	public readonly rowCount: number;

	private readonly _rows: Uint8Array;
	private _min: number;
	private _max: number = -1;
	private _count: number = 0;

	/**
	 * Constructor.
	 * @param rowCount defines the number of rows of the grid (S + 1).
	 */
	public constructor(rowCount: number) {
		this.rowCount = Math.max(0, rowCount >> 0);
		this._rows = new Uint8Array(this.rowCount);
		this._min = this.rowCount;
	}

	/** Number of dirty rows. */
	public get count(): number {
		return this._count;
	}

	/** True when no row is dirty. */
	public get isEmpty(): boolean {
		return this._count === 0;
	}

	/**
	 * Marks the rows [firstRow, lastRow] dirty (clamped to the grid).
	 * @param firstRow defines the first row.
	 * @param lastRow defines the last row (inclusive).
	 */
	public mark(firstRow: number, lastRow: number): void {
		const first = Math.max(0, Math.floor(firstRow));
		const last = Math.min(this.rowCount - 1, Math.floor(lastRow));

		for (let row = first; row <= last; ++row) {
			if (!this._rows[row]) {
				this._rows[row] = 1;
				++this._count;
			}
		}

		if (first <= last) {
			this._min = Math.min(this._min, first);
			this._max = Math.max(this._max, last);
		}
	}

	/** Clears every dirty row. */
	public clear(): void {
		this._rows.fill(0);
		this._min = this.rowCount;
		this._max = -1;
		this._count = 0;
	}

	/**
	 * Takes (and clears) the first dirty rows as bands: runs separated by at most `mergeGap` clean rows are merged, and the rows of the
	 * returned bands (merged clean rows included) never exceed `maxRows` (a band is cut, its remaining rows stay dirty). At least one row
	 * is returned when a row is dirty and maxRows >= 1.
	 * @param maxRows defines the maximum number of rows to take (Infinity = every dirty row).
	 * @param mergeGap defines the maximum number of clean rows merged into a band.
	 */
	public take(maxRows: number, mergeGap: number = TERRAIN_UPLOAD_ROW_MERGE_GAP): ITerrainRowRange[] {
		const bands: ITerrainRowRange[] = [];
		if (!this._count || !(maxRows >= 1)) {
			return bands;
		}

		// Contiguous runs of dirty rows, merged when separated by small gaps.
		const runs: ITerrainRowRange[] = [];
		for (let row = this._min; row <= this._max; ++row) {
			if (!this._rows[row]) {
				continue;
			}

			const previous = runs[runs.length - 1];
			if (previous && row - previous.last - 1 <= mergeGap) {
				previous.last = row;
			} else {
				runs.push({ first: row, last: row });
			}
		}

		let budget = Math.floor(Math.min(maxRows, Number.MAX_SAFE_INTEGER));
		for (const run of runs) {
			if (budget <= 0) {
				break;
			}

			const last = Math.min(run.last, run.first + budget - 1);
			bands.push({ first: run.first, last });
			budget -= last - run.first + 1;

			for (let row = run.first; row <= last; ++row) {
				if (this._rows[row]) {
					this._rows[row] = 0;
					--this._count;
				}
			}
		}

		this._updateBounds();

		return bands;
	}

	private _updateBounds(): void {
		if (!this._count) {
			this._min = this.rowCount;
			this._max = -1;
			return;
		}

		let min = this._min;
		while (min <= this._max && !this._rows[min]) {
			++min;
		}

		let max = this._max;
		while (max >= min && !this._rows[max]) {
			--max;
		}

		this._min = min;
		this._max = max;
	}
}

/**
 * Uploads the rows [firstRow, lastRow] of an updatable vertex buffer of the mesh as ONE contiguous band (S8):
 * engine.updateDynamicVertexBuffer(vb.getBuffer(), data.subarray(start, end), start × 4). `data` must be the array held by the buffer
 * (owned by the geometry binding), so the CPU copy used by serialization and the GPU buffer stay identical. Never uses
 * updateVerticesDataDirectly with an offset (it nulls Buffer._data, S8). Returns the uploaded bytes (0 when the buffer is missing or not
 * updatable).
 * @param mesh defines the reference to the mesh.
 * @param kind defines the vertex kind (VertexBuffer.PositionKind, VertexBuffer.NormalKind...).
 * @param data defines the owned array of the buffer.
 * @param firstRow defines the first grid row to upload.
 * @param lastRow defines the last grid row to upload (inclusive).
 * @param rowFloats defines the floats per grid row ((S + 1) × 3 for positions and normals).
 */
export function uploadTerrainVertexRows(mesh: Mesh, kind: string, data: Float32Array, firstRow: number, lastRow: number, rowFloats: number): number {
	const vertexBuffer = mesh.getVertexBuffer(kind);
	if (!vertexBuffer || !vertexBuffer.isUpdatable()) {
		return 0;
	}

	const buffer = vertexBuffer.getBuffer();
	if (!buffer) {
		return 0;
	}

	const start = Math.max(0, firstRow) * rowFloats;
	const end = Math.min(data.length, (lastRow + 1) * rowFloats);
	if (end <= start) {
		return 0;
	}

	mesh.getEngine().updateDynamicVertexBuffer(buffer, data.subarray(start, end), start * Float32Array.BYTES_PER_ELEMENT);

	return (end - start) * Float32Array.BYTES_PER_ELEMENT;
}

/**
 * Rebuilds the index buffer of the mesh from the hole mask (§4.6): compacted canonical indices, hole quads omitted, set with
 * geometry.setIndices(indices, (S+1)², true) (a new index buffer: WebGL ignores offsets anyway, D4). setIndices recreates the global
 * sub-mesh, so subMeshes[0].indexCount stays right for serialization. Returns the new indices (held by the geometry).
 * @param mesh defines the reference to the terrain mesh.
 * @param grid defines the grid of the terrain.
 * @param holes defines the hole mask (S² quads, 1 = hole), null for no hole.
 */
export function rebuildTerrainIndexBuffer(mesh: Mesh, grid: ITerrainGrid, holes: Uint8Array | null): Uint32Array {
	const indices = buildTerrainIndices(grid, holes);
	mesh.setIndices(indices, grid.columns * grid.rows, true);

	return indices;
}

/**
 * Uploads an inclusive texel rect of a weight map through the plugin (packed rect, level 0, TerrainMaterialPlugin.Gpu seam, §5.6.2).
 * The rect is clamped to the map; returns the uploaded bytes (0 when the map is missing or the rect is empty).
 * Call it (and plugin.generateWeightMapMipmaps) between frames or from scene.onBeforeRenderObservable (processActiveTerrainStroke),
 * never from a material bind or mesh draw observer: on WebGL, the update binds the texture on the active unit then unbinds it, which
 * would drop the texture a material had just bound there for its draw call.
 * @param plugin defines the reference to the terrain material plugin.
 * @param index defines the weight map index.
 * @param rect defines the inclusive texel rect (texture order).
 */
export function uploadTerrainWeightRect(plugin: TerrainMaterialPlugin, index: 0 | 1, rect: ITerrainRect): number {
	const map = plugin.getWeightMap(index);
	if (!map) {
		return 0;
	}

	const x0 = Math.max(0, rect.x0);
	const y0 = Math.max(0, rect.y0);
	const x1 = Math.min(map.size - 1, rect.x1);
	const y1 = Math.min(map.size - 1, rect.y1);
	if (x1 < x0 || y1 < y0) {
		return 0;
	}

	const width = x1 - x0 + 1;
	const height = y1 - y0 + 1;
	plugin.updateWeightMapRegion(index, x0, y0, width, height);

	return width * height * 4;
}
