import { VertexBuffer, type DataBuffer, type Geometry, type IndicesArray, type Mesh, type Scene } from "babylonjs";
import { getTerrainMaterialPlugin, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { isTerrainMesh } from "../../guards/nodes";

import { raycastTerrain } from "../core/raycast";
import { countTerrainHoles, terrainHolesFromIndices } from "../core/holes";
import { computeTerrainHeightRange, extractTerrainHeights } from "../core/heightfield";
import {
	ITerrainGrid,
	ITerrainLocalRay,
	ITerrainRayHit,
	ITerrainRect,
	ITerrainStrokeTarget,
	ITerrainTileResource,
	TerrainRectsByKind,
	TerrainResourceKind,
	TerrainTileResourceProvider,
} from "../core/types";

import { TerrainChangeKind } from "./types";
import { createTerrainSurfaceSampler, TerrainTransform } from "./transform";
import { TerrainWeightsBinding, TerrainWeightsAcquireResult } from "./weights-binding";
import { TerrainGeometryBinding, ITerrainGeometryFlushOptions } from "./geometry-binding";
import { bumpTerrainVersion, getTerrainSharedGeometryMeshes, inferTerrainGrid } from "./eligibility";

/** Why a binding can't be created (subset of TerrainStrokeRefusal, same meaning and §1.17 texts). */
export type TerrainBindingRefusal = "not-eligible" | "shared-geometry";

export type TerrainBindingResult = { binding: TerrainBinding; refusal: null } | { binding: null; refusal: TerrainBindingRefusal };

export interface ITerrainBindingFlushOptions extends ITerrainGeometryFlushOptions {
	/** Default true: weight maps with pending rects are uploaded too. */
	weights?: boolean;
	/** Default true: mipmaps of uploaded weight maps are generated at most every 100 ms (false defers them to finalize). */
	generateMipmaps?: boolean;
}

export interface ITerrainBindingFlushResult {
	/** Vertex and weight bytes sent to the GPU. */
	uploadedBytes: number;
	/** Vertex rows still waiting for their upload (budget exceeded). */
	pendingRows: number;
	heightsWritten: boolean;
	indicesRebuilt: boolean;
	boundsGrown: boolean;
	mipmapsGenerated: number;
}

/**
 * Read-only heightfield of a terrain for hover, picking, cursor and eyedropper (§6.1). Served by the binding's live arrays when the terrain
 * was edited in this session (never stale), else extracted once from the vertex data and cached per geometry, position buffer and index
 * buffer. Getting a view never makes buffers updatable.
 */
export interface ITerrainHeightView {
	readonly mesh: Mesh;
	readonly grid: ITerrainGrid;
	/** (S+1)² local heights, row 0 = +Z edge. Never write into it. */
	readonly heights: Float32Array;
	/** S² quads, 1 = hole. Never write into it. */
	readonly holes: Uint8Array;
	/** Local height range (conservative during a stroke, exact otherwise). */
	readonly heightRange: Readonly<{ min: number; max: number }>;
	/** Number of hole quads. */
	readonly holeCount: number;
	/** True when served by a binding (live arrays). */
	readonly live: boolean;
}

/**
 * Terrain binding of one mesh: the geometry binding (heights, holes, positions, normals) plus the weights binding of the mesh's CURRENT
 * terrain material, behind one provider (undo journal and payload swaps), one signature and one dirty/flush/finalize API (§2.4, §7.2).
 */
export class TerrainBinding {
	public readonly mesh: Mesh;
	public readonly geometry: TerrainGeometryBinding;
	/**
	 * Live resources of the undo journal and payload swaps (§7.1): heights and holes from the geometry binding, weights0 / weights1 from the
	 * weights binding of the current terrain material (acquired on demand; null when there is no terrain material or its weights are not loaded).
	 */
	public readonly provider: TerrainTileResourceProvider;

	/**
	 * Constructor.
	 * @param geometry defines the geometry binding of the mesh.
	 */
	public constructor(geometry: TerrainGeometryBinding) {
		this.mesh = geometry.mesh;
		this.geometry = geometry;
		this.provider = (kind: TerrainResourceKind) => this.getResource(kind);
	}

	public get grid(): ITerrainGrid {
		return this.geometry.grid;
	}

	public get heights(): Float32Array {
		return this.geometry.heights;
	}

	public get holes(): Uint8Array {
		return this.geometry.holes;
	}

	/** Local height range of the live heights (conservative during a stroke, exact after finalize). */
	public get heightRange(): Readonly<{ min: number; max: number }> {
		return this.geometry.heightRange;
	}

	/** False when the mesh was disposed or its geometry replaced: the registry drops it at the next access. */
	public get isValid(): boolean {
		return this.geometry.isValid;
	}

	/** Terrain material plugin of the mesh's current material, or null. */
	public get plugin(): TerrainMaterialPlugin | null {
		return getTerrainMaterialPlugin(this.mesh.material as any);
	}

	/** data.weightMapSize of the current terrain material, 0 without one. */
	public get weightMapSize(): number {
		return this.plugin?.data.weightMapSize ?? 0;
	}

	/** Undo signature `${grid.signature}|${weightMapSize ?? 0}` of the current state (§7.1). */
	public get signature(): string {
		return getTerrainUndoSignature(this.grid, this.weightMapSize);
	}

	/** Weights binding of the current terrain material (acquired when possible), null when refused (see acquireWeights for the reason). */
	public get weights(): TerrainWeightsBinding | null {
		return TerrainWeightsBinding.acquire(this.plugin).weights;
	}

	/** Acquires the weights binding of the current terrain material, or the refusal (no-material, no-layer, weights-loading, weights-error). */
	public acquireWeights(): TerrainWeightsAcquireResult {
		return TerrainWeightsBinding.acquire(this.plugin);
	}

	/**
	 * Live resource of a kind (see provider).
	 * @param kind defines the resource kind.
	 */
	public getResource(kind: TerrainResourceKind): ITerrainTileResource | null {
		if (kind === "heights" || kind === "holes") {
			return this.geometry.getResource(kind);
		}

		return this.weights?.getResource(kind) ?? null;
	}

	/**
	 * Records changed rects (payload swaps, operations): heights/holes go to the geometry binding, weights to the weights binding.
	 * @param changed defines the changed rects by kind.
	 */
	public markDirty(changed: TerrainRectsByKind): void {
		for (const kind of Object.keys(changed) as TerrainResourceKind[]) {
			const rect = changed[kind];
			if (rect) {
				this.markDirtyKind(kind, rect);
			}
		}
	}

	/**
	 * Records one changed rect.
	 * @param kind defines the resource kind.
	 * @param rect defines the inclusive rect (vertices, quads or texels).
	 */
	public markDirtyKind(kind: TerrainResourceKind, rect: ITerrainRect): void {
		if (kind === "heights" || kind === "holes") {
			this.geometry.markDirty(kind, rect);
		} else {
			this.weights?.markDirty(kind, rect);
		}
	}

	/**
	 * Frame flush (§2.4 steps 2-3): geometry (heights → positions, normals, row bands within the budget, bounds, throttled index rebuild)
	 * then the pending weight rects (mipmaps at most every 100 ms).
	 * @param options defines the budget, the clock and what is flushed.
	 */
	public flush(options: ITerrainBindingFlushOptions = {}): ITerrainBindingFlushResult {
		const geometry = this.geometry.flush(options);

		let weightBytes = 0;
		let mipmapsGenerated = 0;

		if (options.weights !== false) {
			const weights = TerrainWeightsBinding.peek(this.plugin);
			if (weights) {
				const result = weights.flush({ nowMs: options.nowMs, generateMipmaps: options.generateMipmaps });
				weightBytes = result.uploadedBytes;
				mipmapsGenerated = result.mipmapsGenerated;
			}
		}

		return {
			uploadedBytes: geometry.uploadedBytes + weightBytes,
			pendingRows: geometry.pendingRows,
			heightsWritten: geometry.heightsWritten,
			indicesRebuilt: geometry.indicesRebuilt,
			boundsGrown: geometry.boundsGrown,
			mipmapsGenerated,
		};
	}

	/**
	 * Finalization (stroke end, undo/redo, operations; §6.1): geometry (exact range, bounding refresh, GroundMesh height quads, final index
	 * rebuild) and weights (uploads, mipmaps, "dirty since save"). Without kinds, finalizes everything changed since the last finalize.
	 * Returns the changed kinds to notify (heights, holes, weights).
	 * @param kinds defines the kinds to finalize (a list or the changed rects of a swap).
	 */
	public finalize(kinds?: readonly TerrainResourceKind[] | TerrainRectsByKind): TerrainChangeKind[] {
		const list = kinds === undefined ? null : getResourceKinds(kinds);

		const changed: TerrainChangeKind[] = this.geometry.finalize(list ? { heights: list.includes("heights"), holes: list.includes("holes") } : undefined);

		const weights = list ? (list.includes("weights0") || list.includes("weights1") ? this.weights : null) : TerrainWeightsBinding.peek(this.plugin);
		if (weights) {
			const indices = list ? list.filter((kind) => kind === "weights0" || kind === "weights1").map((kind) => (kind === "weights0" ? 0 : 1) as 0 | 1) : undefined;
			if (weights.finalize(indices).length) {
				changed.push("weights");
			}
		}

		return changed;
	}

	/**
	 * Heightfield ray-march over the LIVE heights (§4.8): hole quads are transparent unless solidHoles; back faces ignored.
	 * @param ray defines the local ray (TerrainTransform.worldRayToLocal: t is the world ray parameter).
	 * @param solidHoles defines whether hole quads stop the ray (Holes tool).
	 * @param maxT defines the optional maximum ray parameter.
	 */
	public raycastLocal(ray: ITerrainLocalRay, solidHoles: boolean, maxT?: number): ITerrainRayHit | null {
		const range = this.geometry.heightRange;

		return raycastTerrain(this.geometry.heights, this.geometry.grid, ray, {
			minHeight: range.min,
			maxHeight: range.max,
			holes: solidHoles ? null : this.geometry.holes,
			maxT,
		});
	}

	/**
	 * Target of a TerrainStrokeEngine (§3.3 ITerrainStrokeTarget) over the live arrays: heights/holes of the geometry, the weights (paint and
	 * layer filters), the surface sampler of the filters, world ↔ local heights of the transform and markDirty routed to the bindings.
	 * @param transform defines the transform captured at stroke start.
	 * @param weights defines the acquired weights binding (null for sculpt strokes without layer filter).
	 */
	public createStrokeTarget(transform: TerrainTransform, weights: TerrainWeightsBinding | null): ITerrainStrokeTarget {
		const geometry = this.geometry;

		return {
			grid: geometry.grid,
			metric: transform.metric,
			heights: geometry.heights,
			holes: geometry.holes,
			weights: weights?.maps ?? null,
			surface: createTerrainSurfaceSampler(geometry.heights, geometry.grid, transform),
			worldToLocalHeight: (worldY: number) => transform.worldToLocalHeight(worldY),
			localToWorldHeight: (localY: number) => transform.localToWorldHeight(localY),
			markDirty: (kind: TerrainResourceKind, rect: ITerrainRect) => {
				if (kind === "heights" || kind === "holes") {
					geometry.markDirty(kind, rect);
				} else {
					weights?.markDirty(kind, rect);
				}
			},
		};
	}
}

class TerrainHeightView implements ITerrainHeightView {
	public readonly mesh: Mesh;
	public readonly grid: ITerrainGrid;
	public readonly heights: Float32Array;
	public readonly holes: Uint8Array;
	public readonly heightRange: Readonly<{ min: number; max: number }>;
	public readonly live: boolean;

	private readonly _geometry: TerrainGeometryBinding | null;
	private _holeCount: number = -1;

	/**
	 * Constructor.
	 * @param mesh defines the terrain mesh.
	 * @param grid defines its grid.
	 * @param heights defines the (S+1)² local heights.
	 * @param holes defines the S² hole mask.
	 * @param heightRange defines the local height range.
	 * @param geometry defines the geometry binding serving the live arrays (null for heights extracted from the vertex data).
	 */
	public constructor(
		mesh: Mesh,
		grid: ITerrainGrid,
		heights: Float32Array,
		holes: Uint8Array,
		heightRange: Readonly<{ min: number; max: number }>,
		geometry: TerrainGeometryBinding | null
	) {
		this.mesh = mesh;
		this.grid = grid;
		this.heights = heights;
		this.holes = holes;
		this.heightRange = heightRange;
		this.live = geometry !== null;
		this._geometry = geometry;
	}

	/** Live views: the count of the binding, recounted only when its holes revision changed. Extracted views never change: counted once. */
	public get holeCount(): number {
		if (this._geometry) {
			return this._geometry.holeCount;
		}

		if (this._holeCount < 0) {
			this._holeCount = countTerrainHoles(this.holes);
		}

		return this._holeCount;
	}
}

interface ITerrainHeightViewEntry {
	geometry: Geometry | null;
	geometryUniqueId: number;
	positions: VertexBuffer | null;
	indices: IndicesArray | null;
	indexBuffer: DataBuffer | null;
	grid: ITerrainGrid;
	view: TerrainHeightView;
}

interface ITerrainSceneRegistry {
	readonly bindings: WeakMap<Mesh, TerrainBinding>;
	readonly views: WeakMap<Mesh, ITerrainHeightViewEntry>;
}

const registries = new WeakMap<Scene, ITerrainSceneRegistry>();
const bindingViews = new WeakMap<TerrainBinding, TerrainHeightView>();

/**
 * Undo signature of a terrain state (§7.1): `${grid.signature}|${weightMapSize ?? 0}`.
 * @param grid defines the grid of the terrain.
 * @param weightMapSize defines data.weightMapSize of its terrain material (null/undefined/0 without one).
 */
export function getTerrainUndoSignature(grid: ITerrainGrid, weightMapSize: number | null | undefined): string {
	return `${grid.signature}|${weightMapSize ?? 0}`;
}

/**
 * Binding of a terrain for EDITING (§6.1 "first edit"): returns the existing binding while it is valid, else creates it (owned updatable
 * positions/normals, heights, holes). Refuses, every time (a graph Clone made after the first edit shares the bound buffers),
 * "shared-geometry" (another non-instance mesh uses the geometry), and "not-eligible" (disposed, no geometry, not a TerrainMesh, invalid
 * grid). Eligibility policies (lock, visibility, read-only...) are checked by the callers. Undo/redo of an existing edit uses `peekTerrainBinding(mesh) ?? getTerrainBinding(mesh).binding`.
 * @param mesh defines the reference to the terrain mesh.
 */
export function getTerrainBinding(mesh: Mesh): TerrainBindingResult {
	if (mesh.isDisposed() || mesh.getScene().isDisposed || !mesh.geometry || !isTerrainMesh(mesh)) {
		return { binding: null, refusal: "not-eligible" };
	}

	const registry = getSceneRegistry(mesh.getScene());

	if (getTerrainSharedGeometryMeshes(mesh).length > 0) {
		return { binding: null, refusal: "shared-geometry" };
	}

	const existing = registry.bindings.get(mesh);
	if (existing) {
		if (existing.isValid) {
			return { binding: existing, refusal: null };
		}

		dropBinding(registry, mesh, existing);
	}

	const grid = inferTerrainGrid(mesh);
	if (!grid) {
		return { binding: null, refusal: "not-eligible" };
	}

	const binding = new TerrainBinding(TerrainGeometryBinding.Create(mesh, grid));
	registry.bindings.set(mesh, binding);
	registry.views.delete(mesh);

	return { binding, refusal: null };
}

/**
 * Returns the binding of the mesh when it exists and is still valid (no creation, no side effect other than dropping an invalid binding).
 * Undo/redo, operations and flushes use it to find the binding of an edited terrain.
 * @param mesh defines the reference to the terrain mesh.
 */
export function peekTerrainBinding(mesh: Mesh): TerrainBinding | null {
	const registry = registries.get(mesh.getScene());
	const binding = registry?.bindings.get(mesh);
	if (!registry || !binding) {
		return null;
	}

	if (binding.isValid) {
		return binding;
	}

	dropBinding(registry, mesh, binding);
	return null;
}

/**
 * Drops the binding and the cached height view of the mesh (geometry replaced by other code). The vertex buffers are left as they are (they
 * stay updatable).
 * @param mesh defines the reference to the mesh.
 */
export function dropTerrainBinding(mesh: Mesh): void {
	const registry = registries.get(mesh.getScene());
	if (!registry) {
		return;
	}

	const binding = registry.bindings.get(mesh);
	if (binding) {
		dropBinding(registry, mesh, binding);
	}

	registry.views.delete(mesh);
}

/**
 * Replaces the vertex data of the terrain by a grid and registers the new binding (creation, resize, resample; §6.12 step 4): owned
 * updatable positions, normals and UVs, canonical indices without the hole quads, GroundMesh internals, exact bounding refresh and a terrain
 * version bump. `heights` and `holes` become the binding's arrays (not copied). Other vertex kinds are not touched.
 * @param mesh defines the reference to the terrain mesh.
 * @param grid defines the new grid.
 * @param heights defines the (S+1)² local heights (row 0 = +Z edge).
 * @param holes defines the S² hole mask (null = no hole).
 */
export function installTerrainGeometry(mesh: Mesh, grid: ITerrainGrid, heights: Float32Array, holes: Uint8Array | null): TerrainBinding {
	dropTerrainBinding(mesh);

	const registry = getSceneRegistry(mesh.getScene());
	const binding = new TerrainBinding(TerrainGeometryBinding.Install(mesh, grid, heights, holes));
	registry.bindings.set(mesh, binding);

	bumpTerrainVersion(mesh);

	return binding;
}

/**
 * Read-only heightfield of a terrain (hover, picking, cursor, eyedropper; §6.1): the live arrays of its binding when it has one,
 * else heights and hole mask extracted once from the vertex data and cached until the geometry, the position buffer or the index buffer
 * changes (never invalidated by terrain change events). Null when the mesh has no valid grid.
 * @param mesh defines the reference to the terrain mesh.
 */
export function getTerrainHeightView(mesh: Mesh): ITerrainHeightView | null {
	const binding = peekTerrainBinding(mesh);
	if (binding) {
		let view = bindingViews.get(binding);
		if (!view) {
			view = new TerrainHeightView(mesh, binding.grid, binding.heights, binding.holes, binding.geometry.heightRange, binding.geometry);
			bindingViews.set(binding, view);
		}

		return view;
	}

	const grid = inferTerrainGrid(mesh);
	if (!grid || mesh.getScene().isDisposed) {
		return null;
	}

	const registry = getSceneRegistry(mesh.getScene());
	const geometry = mesh.geometry ?? null;
	const positions = mesh.getVertexBuffer(VertexBuffer.PositionKind) ?? null;
	const indices = geometry?.getIndices() ?? null;
	const indexBuffer = geometry?.getIndexBuffer() ?? null;

	const cached = registry.views.get(mesh);
	if (
		cached &&
		cached.geometry === geometry &&
		cached.geometryUniqueId === (geometry?.uniqueId ?? -1) &&
		cached.positions === positions &&
		cached.indices === indices &&
		cached.indexBuffer === indexBuffer &&
		cached.grid === grid
	) {
		return cached.view;
	}

	const data = mesh.getVerticesData(VertexBuffer.PositionKind);
	if (!data || data.length !== grid.columns * grid.rows * 3) {
		return null;
	}

	const heights = extractTerrainHeights(data, grid);
	const holes = indices ? terrainHolesFromIndices(grid, indices).holes : new Uint8Array(grid.subdivisions * grid.subdivisions);
	const range = computeTerrainHeightRange(heights, grid);

	const view = new TerrainHeightView(mesh, grid, heights, holes, { min: range.min, max: range.max }, null);
	registry.views.set(mesh, {
		geometry,
		geometryUniqueId: geometry?.uniqueId ?? -1,
		positions,
		indices,
		indexBuffer,
		grid,
		view,
	});

	return view;
}

function getSceneRegistry(scene: Scene): ITerrainSceneRegistry {
	let registry = registries.get(scene);
	if (!registry) {
		registry = {
			bindings: new WeakMap<Mesh, TerrainBinding>(),
			views: new WeakMap<Mesh, ITerrainHeightViewEntry>(),
		};

		registries.set(scene, registry);

		scene.onDisposeObservable.addOnce(() => {
			try {
				registries.delete(scene);
			} catch (e) {
				console.error(e);
			}
		});
	}

	return registry;
}

function dropBinding(registry: ITerrainSceneRegistry, mesh: Mesh, binding: TerrainBinding): void {
	binding.geometry.dispose();
	registry.bindings.delete(mesh);
	bindingViews.delete(binding);
}

function getResourceKinds(kinds: readonly TerrainResourceKind[] | TerrainRectsByKind): TerrainResourceKind[] {
	if (Array.isArray(kinds)) {
		return kinds.slice();
	}

	// Empty rects (x1 < x0 or y1 < y0) changed nothing.
	const rects = kinds as TerrainRectsByKind;
	return (Object.keys(rects) as TerrainResourceKind[]).filter((kind) => {
		const rect = rects[kind];
		return !!rect && rect.x1 >= rect.x0 && rect.y1 >= rect.y0;
	});
}
