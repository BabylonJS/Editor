import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

import { Logger } from "@babylonjs/core/Misc/logger";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";

import { isTerrainMesh } from "../tools/guards";

/** Number of rendered frames configureTerrainGroundMeshes waits for the positions of a delay-loaded terrain geometry (§6.7). */
const TERRAIN_GROUND_REPAIR_MAX_FRAMES = 600;
/** Relative tolerance (of the ground size) under which a GroundMesh internal is considered unchanged. */
const TERRAIN_GROUND_REPAIR_TOLERANCE = 1e-6;

/** Meshes waiting for their geometry (one frame observer per mesh, whatever the number of configureTerrainGroundMeshes calls). */
const terrainGroundRepairsPending = new WeakSet<AbstractMesh>();

/**
 * Fixes the GroundMesh internals of a terrain from its geometry (§6.7); true when something changed.
 * Only applies to terrains (isTerrainMesh) whose positions form a square (S+1)² grid with S >= 1 (row 0 = +Z edge, column 0 = -X edge):
 * subdivisions, sizes and extents are read from the grid corners and the lazily computed height quads are reset, so
 * `getHeightAtCoordinates`/`getNormalAtCoordinates` follow the sculpted relief. Holes are ignored by these Babylon functions, as for any ground.
 */
export function repairTerrainGroundMesh(mesh: AbstractMesh): boolean {
	if (!isTerrainMesh(mesh)) {
		return false;
	}

	const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
	if (!positions) {
		return false;
	}

	const vertexCount = positions.length / 3;
	const side = Math.round(Math.sqrt(vertexCount));
	if (side * side !== vertexCount || side < 2) {
		return false;
	}

	const subdivisions = side - 1;

	// Row 0 is the +Z edge, row S the -Z edge; column 0 is the -X edge.
	const minX = positions[0];
	const maxX = positions[3 * subdivisions];
	const maxZ = positions[2];
	const minZ = positions[3 * subdivisions * side + 2];

	const width = maxX - minX;
	const height = maxZ - minZ;
	if (!(width > 0 && height > 0)) {
		return false;
	}

	const widthTolerance = TERRAIN_GROUND_REPAIR_TOLERANCE * width;
	const heightTolerance = TERRAIN_GROUND_REPAIR_TOLERANCE * height;

	const changed =
		mesh._subdivisionsX !== subdivisions ||
		mesh._subdivisionsY !== subdivisions ||
		isTerrainGroundValueDifferent(mesh._width, width, widthTolerance) ||
		isTerrainGroundValueDifferent(mesh._height, height, heightTolerance) ||
		isTerrainGroundValueDifferent(mesh._minX, minX, widthTolerance) ||
		isTerrainGroundValueDifferent(mesh._maxX, maxX, widthTolerance) ||
		isTerrainGroundValueDifferent(mesh._minZ, minZ, heightTolerance) ||
		isTerrainGroundValueDifferent(mesh._maxZ, maxZ, heightTolerance);

	mesh._subdivisionsX = subdivisions;
	mesh._subdivisionsY = subdivisions;
	mesh._width = width;
	mesh._height = height;
	mesh._minX = minX;
	mesh._maxX = maxX;
	mesh._minZ = minZ;
	mesh._maxZ = maxZ;

	// Recomputed lazily by getHeightAtCoordinates/getNormalAtCoordinates from the current positions.
	(mesh as unknown as { _heightQuads: unknown[] })._heightQuads = [];

	return changed;
}

/**
 * Repairs every terrain (isTerrainMesh) of the source (§6.7): at once when its positions exist, otherwise (geometry still delay-loading)
 * at the first rendered frame where they exist. The frame observer is removed after the repair, when the mesh is disposed, or after 600 frames.
 */
export function configureTerrainGroundMeshes(source: Scene | AssetContainer): void {
	source.meshes.forEach((mesh) => {
		if (!isTerrainMesh(mesh) || mesh.isDisposed()) {
			return;
		}

		if (hasTerrainGroundPositions(mesh)) {
			tryRepairTerrainGroundMesh(mesh);
		} else {
			deferTerrainGroundMeshRepair(mesh);
		}
	});
}

function isTerrainGroundValueDifferent(current: number, expected: number, tolerance: number): boolean {
	// Written so that a missing (undefined/NaN) internal counts as different.
	return !(Math.abs(current - expected) <= tolerance);
}

function hasTerrainGroundPositions(mesh: AbstractMesh): boolean {
	// getData() never copies (getVerticesData may), and is null while a delay-loaded geometry isn't ready.
	return !!mesh.getVertexBuffer(VertexBuffer.PositionKind)?.getData();
}

function tryRepairTerrainGroundMesh(mesh: AbstractMesh): void {
	try {
		repairTerrainGroundMesh(mesh);
	} catch (e) {
		Logger.Warn(`[Terrain] Failed to repair the ground mesh "${mesh.name}": ${e instanceof Error ? e.message : String(e)}`);
	}
}

function deferTerrainGroundMeshRepair(mesh: AbstractMesh): void {
	if (terrainGroundRepairsPending.has(mesh)) {
		return;
	}

	terrainGroundRepairsPending.add(mesh);

	const scene = mesh.getScene();

	let frames = 0;
	const observer = scene.onBeforeRenderObservable.add(() => {
		let done: boolean;

		try {
			if (mesh.isDisposed()) {
				done = true;
			} else if (hasTerrainGroundPositions(mesh)) {
				tryRepairTerrainGroundMesh(mesh);
				done = true;
			} else {
				done = ++frames >= TERRAIN_GROUND_REPAIR_MAX_FRAMES;
			}
		} catch (e) {
			Logger.Warn(`[Terrain] Failed to check the geometry of the ground mesh "${mesh.name}": ${e instanceof Error ? e.message : String(e)}`);
			done = true;
		}

		if (done) {
			terrainGroundRepairsPending.delete(mesh);
			scene.onBeforeRenderObservable.remove(observer);
		}
	});
}
