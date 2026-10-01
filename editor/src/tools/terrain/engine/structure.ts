import { Tools, VertexBuffer, type FloatArray, type Geometry, type Mesh, type Node } from "babylonjs";
import { TERRAIN_MAX_SUBDIVISIONS, TERRAIN_MIN_SUBDIVISIONS } from "babylonjs-editor-tools";

import { toast } from "sonner";

import type { Editor } from "../../../editor/main";
import { UniqueNumber } from "../../tools";

import { TerrainGrid } from "../core/grid";
import { createTerrainSnapshotPayload } from "../core/journal";
import { resampleTerrainHeights, resampleTerrainHoles } from "../core/resample";
import { getDefaultTerrainSubdivisions } from "../core/settings";
import type { ITerrainGrid } from "../core/types";

import { markTerrainDependentsChanged } from "./dependents";
import { bumpTerrainVersion, getTerrainSharedGeometryMeshes } from "./eligibility";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { assertTerrainMutationAllowed, createTerrainMaterial, installTerrainMaterialAssignment } from "./material";
import { createTerrainRefusedError } from "./operations";
import { dropTerrainBinding, getTerrainHeightView, installTerrainGeometry } from "./registry";
import type { ITerrainCreateOptions, ITerrainResizeOptions, TerrainChangeKind } from "./types";
import { createTerrainBusyScope, TerrainWorkSlicer, type ITerrainBusyScope } from "./yield";

/** Vertex kinds a terrain keeps (§6.12 "Vertex kinds"): every other kind is removed by resizes (undo restores them). */
export const TERRAIN_VERTEX_KINDS: readonly string[] = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UVKind];

/** Default size (local cm) of a new terrain (§1.13.1, §3.7.4). */
export const TERRAIN_NEW_TERRAIN_SIZE = 10240;

/** Copy of one vertex buffer (float data of the original array type, components per vertex, updatable flag). */
interface ITerrainVertexKindData {
	kind: string;
	data: FloatArray;
	size: number;
	updatable: boolean;
}

/** Terrain geometry swapped by the undo entries of resizes (§7.1): its grid, heights and holes, plus the vertex kinds a resize removed. */
interface ITerrainGeometryState {
	grid: ITerrainGrid;
	heights: Float32Array;
	holes: Uint8Array;
	extraKinds: ITerrainVertexKindData[];
}

/** Visibility state swapped by setTerrainMeshVisible. */
interface ITerrainVisibilityState {
	nodes: { node: Node; enabled: boolean }[];
	isVisible: boolean;
}

/**
 * Gives a new terrain its flat grid (default 10240 × 10240 cm, getDefaultTerrainSubdivisions) and a new terrain material whose "Base"
 * layer covers everything (addTerrainMesh).
 * @param mesh defines the new terrain.
 * @param options defines its size, resolution and texture sizes.
 */
export function initializeTerrainMesh(mesh: Mesh, options: ITerrainCreateOptions = {}): void {
	const width = getPositiveNumber(options.width) ?? TERRAIN_NEW_TERRAIN_SIZE;
	const height = getPositiveNumber(options.height) ?? TERRAIN_NEW_TERRAIN_SIZE;
	const subdivisions = normalizeTerrainSubdivisions(options.subdivisions ?? getDefaultTerrainSubdivisions(width, height));

	const grid = new TerrainGrid(subdivisions, width, height);
	installTerrainGeometry(mesh, grid, new Float32Array(grid.columns * grid.rows), null);

	const { material } = createTerrainMaterial(mesh, { weightMapSize: options.weightMapSize, layerTextureSize: options.layerTextureSize });
	installTerrainMaterialAssignment(mesh, { material, remembered: material, hasReplaced: false, replaced: null });
}

/**
 * Resamples the heights and holes (§4.9) when the resolution changes, or stretches the relief when only the size changes; other vertex kinds
 * removed (toast.vertex-data-removed), weight maps untouched (UV space). One undo entry `{ grid, heights, holes, removed vertex kinds }`.
 * Also the fix of terrains with an unsupported resolution. No-op when nothing changes.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param options defines the new width/height (local cm) and subdivisions (2..1024).
 */
export async function resizeTerrain(editor: Editor, mesh: Mesh, options: ITerrainResizeOptions): Promise<void> {
	assertTerrainMutationAllowed(editor, mesh, { allowUnsupportedResolution: true });

	if (getTerrainSharedGeometryMeshes(mesh).length) {
		throw createTerrainRefusedError("shared-geometry");
	}

	const view = getTerrainHeightView(mesh);
	if (!view) {
		throw createTerrainRefusedError("not-eligible");
	}

	const from = view.grid;
	const subdivisions = options.subdivisions === undefined ? normalizeTerrainSubdivisions(from.subdivisions) : normalizeTerrainSubdivisions(options.subdivisions);
	const width = getPositiveNumber(options.width) ?? from.width;
	const height = getPositiveNumber(options.height) ?? from.height;

	if (subdivisions === from.subdivisions && width === from.width && height === from.height) {
		return;
	}

	const resample = subdivisions !== from.subdivisions;
	const scope = createTerrainBusyScope(resample ? "Resampling" : "Resizing", mesh);

	try {
		const slicer = new TerrainWorkSlicer();

		const before = captureGeometryState(mesh);
		const removedKinds = before.extraKinds.map((kind) => kind.kind);

		const target = new TerrainGrid(subdivisions, width, height);
		const heights = resample ? resampleTerrainHeights(before.heights, before.grid, target) : Float32Array.from(before.heights);
		const holes = resample ? resampleTerrainHoles(before.holes, before.grid, target) : Uint8Array.from(before.holes);

		scope.setProgress(0.6);
		await checkpoint(slicer, scope);

		installGeometryState(mesh, { grid: target, heights, holes, extraKinds: [] });

		const kinds: TerrainChangeKind[] = ["grid", "heights", "holes"];
		registerTerrainGeometryEntry(mesh, before, resample ? "Resample terrain" : "Resize terrain", kinds);

		notifyRemovedVertexKinds(mesh, removedKinds);
		markTerrainDependentsChanged(mesh, ["grid"]);
		notifyTerrainChanged(mesh, kinds, "resize");

		scope.setProgress(1);
	} finally {
		scope.dispose();
	}
}

/**
 * `mesh.makeGeometryUnique()` with the editor's ids (random id, UniqueNumber uniqueId), in one undo entry re-applying the previously shared
 * geometry (toast.geometry-unique). No-op when the geometry is not shared.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function makeTerrainGeometryUnique(editor: Editor, mesh: Mesh): void {
	if (!getTerrainSharedGeometryMeshes(mesh).length) {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { allowNewerVersion: true, allowUnsupportedResolution: true });

	const scope = createTerrainBusyScope("Making the geometry unique", mesh);

	try {
		const shared = mesh.geometry ?? null;

		mesh.makeGeometryUnique();

		const unique = mesh.geometry ?? null;
		if (unique) {
			unique.id = Tools.RandomId();
			unique.uniqueId = UniqueNumber.Get();
		}

		dropTerrainBinding(mesh);
		bumpTerrainVersion(mesh);

		registerTerrainSharingEntry(mesh, shared, "Make terrain geometry unique", unique !== shared ? unique : null);

		toast.info(`The terrain geometry is now unique to “${mesh.name}”.`);
		notifyTerrainChanged(mesh, ["node"], "settings");
	} finally {
		scope.dispose();
	}
}

/**
 * `setEnabled(true)` on the mesh and every disabled ancestor and `isVisible = true`, in one undo entry
 * (enabled state of those nodes and isVisible). No-op when the mesh is already shown.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function setTerrainMeshVisible(editor: Editor, mesh: Mesh): void {
	const disabled: Node[] = [];
	for (let node: Node | null = mesh; node; node = node.parent) {
		if (!node.isEnabled(false)) {
			disabled.push(node);
		}
	}

	if (!disabled.length && mesh.isVisible) {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { skipEligibility: true });

	const before: ITerrainVisibilityState = { nodes: disabled.map((node) => ({ node, enabled: false })), isVisible: mesh.isVisible };

	const shown: ITerrainVisibilityState = { nodes: disabled.map((node) => ({ node, enabled: true })), isVisible: true };
	installTerrainVisibilityState(mesh, shown);

	const payload = createTerrainSnapshotPayload<ITerrainVisibilityState>({
		state: before,
		byteLength: 0,
		signature: "",
		exchange: (state) => {
			const previous: ITerrainVisibilityState = { nodes: state.nodes.map(({ node }) => ({ node, enabled: node.isEnabled(false) })), isVisible: mesh.isVisible };
			installTerrainVisibilityState(mesh, state);
			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, "Show terrain", { snapshot: true, kinds: ["node"] });
	notifyTerrainChanged(mesh, ["node"], "settings");
}

/**
 * Terrain resolution rule (D2, §7.5): integer subdivisions clamped to TERRAIN_MIN_SUBDIVISIONS..TERRAIN_MAX_SUBDIVISIONS.
 * Throws a RangeError for values that are not finite numbers.
 * @param value defines the requested subdivisions.
 */
export function normalizeTerrainSubdivisions(value: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new RangeError(`Invalid terrain subdivisions: ${value}`);
	}

	return Math.min(TERRAIN_MAX_SUBDIVISIONS, Math.max(TERRAIN_MIN_SUBDIVISIONS, Math.round(value)));
}

// Geometry states

function registerTerrainGeometryEntry(mesh: Mesh, before: ITerrainGeometryState, label: string, kinds: TerrainChangeKind[]): void {
	const payload = createTerrainSnapshotPayload<ITerrainGeometryState>({
		state: before,
		byteLength: getGeometryStateBytes(before),
		signature: "",
		exchange: (state) => {
			const previous = captureGeometryState(mesh);

			installGeometryState(mesh, state);
			markTerrainDependentsChanged(mesh, ["grid"]);

			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, label, { snapshot: true, kinds });
}

function getGeometryStateBytes(state: ITerrainGeometryState): number {
	return state.extraKinds.reduce((bytes, kind) => bytes + getArrayBytes(kind.data), state.heights.byteLength + state.holes.byteLength);
}

function getArrayBytes(array: FloatArray): number {
	return Array.isArray(array) ? array.length * 8 : (array as ArrayBufferView).byteLength;
}

/** Copies (forceCopy, original array type: number[] stays number[]) of the vertex kinds a terrain doesn't keep. */
function captureExtraVertexKinds(mesh: Mesh): ITerrainVertexKindData[] {
	const geometry = mesh.geometry;
	if (!geometry) {
		return [];
	}

	const result: ITerrainVertexKindData[] = [];
	for (const kind of geometry.getVerticesDataKinds()) {
		const buffer = geometry.getVertexBuffer(kind);
		const data = buffer && !TERRAIN_VERTEX_KINDS.includes(kind) ? geometry.getVerticesData(kind, true, true) : null;
		if (buffer && data) {
			result.push({ kind, data, size: buffer.getSize(), updatable: buffer.isUpdatable() });
		}
	}

	return result;
}

function captureGeometryState(mesh: Mesh): ITerrainGeometryState {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		throw createTerrainRefusedError("not-eligible");
	}

	return {
		grid: view.grid,
		heights: Float32Array.from(view.heights),
		holes: Uint8Array.from(view.holes),
		extraKinds: captureExtraVertexKinds(mesh),
	};
}

/** Installs a terrain grid (registry.installTerrainGeometry: owned updatable positions/normals/UVs, canonical indices, bounds, binding). */
function installGeometryState(mesh: Mesh, state: ITerrainGeometryState): void {
	for (const kind of mesh.getVerticesDataKinds(true)) {
		if (!TERRAIN_VERTEX_KINDS.includes(kind)) {
			mesh.removeVerticesData(kind);
		}
	}

	installTerrainGeometry(mesh, state.grid, state.heights, state.holes);

	for (const kind of state.extraKinds) {
		mesh.setVerticesData(kind.kind, kind.data, kind.updatable, kind.size);
	}
}

function notifyRemovedVertexKinds(mesh: Mesh, removedKinds: string[]): void {
	if (removedKinds.length) {
		toast.info(`Removed ${removedKinds.join(", ")} from “${mesh.name}”: terrains keep positions, normals and UVs only (undo restores them).`);
	}
}

// Sharing and visibility states

function registerTerrainSharingEntry(mesh: Mesh, shared: Geometry | null, label: string, uniqueGeometry: Geometry | null): void {
	const payload = createTerrainSnapshotPayload<Geometry | null>({
		state: shared,
		byteLength: 0,
		signature: "",
		exchange: (geometry) => {
			const previous = mesh.geometry ?? null;

			if (geometry && geometry !== mesh.geometry && !geometry.isDisposed()) {
				geometry.applyToMesh(mesh);
			}

			dropTerrainBinding(mesh);
			bumpTerrainVersion(mesh);

			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, label, {
		snapshot: true,
		kinds: ["node"],
		onRelease: (undone) => {
			// Released while undone: the unique copy is no longer used by anything.
			if (undone && uniqueGeometry && !uniqueGeometry.isDisposed() && uniqueGeometry.meshes.length === 0) {
				uniqueGeometry.dispose();
			}
		},
	});
}

function installTerrainVisibilityState(mesh: Mesh, state: ITerrainVisibilityState): void {
	for (const { node, enabled } of state.nodes) {
		node.setEnabled(enabled);
	}

	mesh.isVisible = state.isVisible;
}

// Misc

/** Yields when the slice budget is spent, then throws when the scope was aborted (scene or mesh disposed). */
async function checkpoint(slicer: TerrainWorkSlicer, scope: ITerrainBusyScope): Promise<void> {
	await slicer.maybeYield();
	scope.throwIfAborted();
}

function getPositiveNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
