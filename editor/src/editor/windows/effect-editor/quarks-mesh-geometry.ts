import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { ParticleSystem as QuarksParticleSystem } from "babylon.quarks";

/**
 * Editor-only: mesh last chosen in the Geometry field (for labels / vertex counts in the inspector).
 * Quarks mesh mode uses {@link applyMeshGeometryToQuarksSystem} buffers, not this mesh at runtime.
 */
export const EDITOR_GEOMETRY_PREVIEW_MESH_KEY = "_editorGeometryPreviewMesh";
/** Optional human-readable geometry hint for the inspector (set from the live Quarks scene after load). */
export const EDITOR_GEOMETRY_SOURCE_LABEL_KEY = "_editorGeometrySourceLabel";

/** Same defaults as Quarks `ParticleSystem` billboard quad (see babylon.quarks mesh batch). */
const DEFAULT_POSITIONS = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const DEFAULT_INDICES = new Uint32Array([0, 1, 2, 0, 2, 3]);
const DEFAULT_UVS = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);

function createFallbackNormals(vertexCount: number): Float32Array {
	const out = new Float32Array(vertexCount * 3);
	for (let i = 0; i < vertexCount; i++) {
		out[i * 3 + 2] = 1;
	}
	return out;
}

function toUint32Indices(indices: IndicesArray): Uint32Array {
	if (indices instanceof Uint32Array) {
		return new Uint32Array(indices);
	}
	return Uint32Array.from(indices);
}

type IndicesArray = Uint32Array | Uint16Array | number[];

type InstancingCapableSystem = QuarksParticleSystem & {
	instancingGeometry: Float32Array;
	instancingIndices: Uint32Array;
	instancingNormals?: Float32Array;
	instancingUVs?: Float32Array;
};

/** Internal link from `ParticleSystem` to `BatchedRenderer` (set in `addSystem`). */
type QuarksSystemWithRenderer = QuarksParticleSystem & {
	_renderer?: { updateSystem: (sys: QuarksParticleSystem) => void };
};

/**
 * Quarks only runs `neededToUpdateRender` → `updateSystem` inside `update()`, and `update()` returns
 * immediately when `paused`. The editor keeps previews paused, so geometry changes never reached
 * the batch mesh until play — flush the batch explicitly after mutating instancing buffers.
 */
function flushQuarksBatchAfterGeometryChange(system: QuarksParticleSystem): void {
	(system as QuarksSystemWithRenderer)._renderer?.updateSystem(system);
}

/** After load or deserialization, sync the batch mesh with current instancing/material while preview may stay paused. */
export function flushQuarksParticleBatchGeometry(system: QuarksParticleSystem): void {
	flushQuarksBatchAfterGeometryChange(system);
}

export function getParticleInstancingVertexCount(system: QuarksParticleSystem): number {
	const geo = (system as InstancingCapableSystem).instancingGeometry;
	return geo?.length ? Math.floor(geo.length / 3) : 0;
}

export function getParticleInstancingTriangleCount(system: QuarksParticleSystem): number {
	const idx = (system as InstancingCapableSystem).instancingIndices;
	return idx?.length ? Math.floor(idx.length / 3) : 0;
}

export function getEditorGeometryPreviewMesh(system: QuarksParticleSystem): Mesh | null {
	const raw = (system as unknown as Record<string, unknown>)[EDITOR_GEOMETRY_PREVIEW_MESH_KEY];
	if (!raw || typeof (raw as Mesh).getVerticesData !== "function") {
		return null;
	}
	return raw as Mesh;
}

export function setEditorGeometryPreviewMesh(system: QuarksParticleSystem, mesh: Mesh | null): void {
	const bag = system as unknown as Record<string, unknown>;
	if (mesh) {
		bag[EDITOR_GEOMETRY_PREVIEW_MESH_KEY] = mesh;
		delete bag[EDITOR_GEOMETRY_SOURCE_LABEL_KEY];
	} else {
		delete bag[EDITOR_GEOMETRY_PREVIEW_MESH_KEY];
	}
}

export function getEditorGeometrySourceLabel(system: QuarksParticleSystem): string | null {
	const raw = (system as unknown as Record<string, unknown>)[EDITOR_GEOMETRY_SOURCE_LABEL_KEY];
	return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function setEditorGeometrySourceLabel(system: QuarksParticleSystem, label: string | null): void {
	const bag = system as unknown as Record<string, unknown>;
	if (label) {
		bag[EDITOR_GEOMETRY_SOURCE_LABEL_KEY] = label;
	} else {
		delete bag[EDITOR_GEOMETRY_SOURCE_LABEL_KEY];
	}
}

/** Quarks mesh batch uses `ParticleSystem.material` (see `meshMaterial.babylon.js`); copy from the source asset when present. */
function syncMeshMaterialToParticleSystem(system: QuarksParticleSystem, mesh: Mesh): void {
	const mat = mesh.material;
	if (!mat) {
		return;
	}
	(system as QuarksParticleSystem & { material?: typeof mat }).material = mat;
}

/**
 * Applies mesh instancing buffers the same way as babylon.quarks examples (`meshMaterial.babylon.js`).
 * Clears to the built-in quad when `mesh` is null.
 *
 * Quarks setters for `instancingGeometry` / indices call `restart()`, which clears `paused` — restore it
 * so switching render mode or geometry does not start emission while the preview is stopped.
 */
export function applyMeshGeometryToQuarksSystem(system: QuarksParticleSystem, mesh: Mesh | null): void {
	const pausedBefore = system.paused;
	const s = system as InstancingCapableSystem;

	try {
		if (!mesh) {
			s.instancingGeometry = Float32Array.from(DEFAULT_POSITIONS);
			s.instancingIndices = Uint32Array.from(DEFAULT_INDICES);
			s.instancingUVs = Float32Array.from(DEFAULT_UVS);
			s.instancingNormals = createFallbackNormals(4);
			delete (system as unknown as Record<string, unknown>)[EDITOR_GEOMETRY_SOURCE_LABEL_KEY];
			system.neededToUpdateRender = true;
			flushQuarksBatchAfterGeometryChange(system);
			return;
		}

		const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
		const idx = mesh.getIndices();
		if (!pos?.length || !idx?.length) {
			return;
		}

		const positions = new Float32Array(pos);
		const indices = toUint32Indices(idx as IndicesArray);
		const vCount = positions.length / 3;
		if (vCount <= 0 || indices.length < 3) {
			return;
		}

		const normalsRaw = mesh.getVerticesData(VertexBuffer.NormalKind);
		const uvsRaw = mesh.getVerticesData(VertexBuffer.UVKind);

		const normals =
			normalsRaw && normalsRaw.length >= positions.length ? new Float32Array(normalsRaw) : createFallbackNormals(vCount);

		const uvs = new Float32Array(vCount * 2);
		if (uvsRaw && uvsRaw.length >= vCount * 2) {
			for (let i = 0; i < vCount * 2; i++) {
				uvs[i] = uvsRaw[i] ?? 0;
			}
		}

		s.instancingGeometry = positions;
		s.instancingIndices = indices;
		s.instancingNormals = normals;
		s.instancingUVs = uvs;
		syncMeshMaterialToParticleSystem(system, mesh);
		system.neededToUpdateRender = true;
		flushQuarksBatchAfterGeometryChange(system);
	} finally {
		if (pausedBefore) {
			system.pause();
		}
	}
}
