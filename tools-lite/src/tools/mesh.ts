import { Mesh, SceneContext, Vec3 } from "@babylonjs/lite";

import { SceneLoaderQualitySelector } from "../loading/loader";
import { getMeshLodLevels, setMeshLodLevelDistance } from "../loading/mesh";

import { isMesh } from "./guards";
import { getSceneData } from "./scene";
import { isNodeFromStaticGroup, setNodeEnabled } from "./node";

export function configureMeshDistanceOrScreenCoverage(scene: SceneContext) {
	getSceneData(scene).meshes.forEach((mesh) => {
		if (!isMesh(mesh)) {
			return;
		}

		getMeshLodLevels(mesh).forEach((lod) => {
			if (lod.mesh && lod.mesh.originalDistanceOrScreenCoverage === undefined) {
				lod.mesh.originalDistanceOrScreenCoverage = lod.distanceOrScreenCoverage;
			}
		});
	});
}

/**
 * Updates the distance or screen coverage of the LOD levels of the meshes in the scene to match the given quality when possible.
 * @param quality defines the quality to apply to the meshes LOD levels.
 * @param scene defines the scene to update the meshes LOD levels in.
 * @see `SceneLoaderQualitySelector` for more information on the available quality levels.
 */
export function applyMeshesLODQuality(quality: SceneLoaderQualitySelector, scene: SceneContext) {
	getSceneData(scene).meshes.forEach((mesh) => {
		getMeshLodLevels(mesh).forEach((lod, index) => {
			if (!lod.mesh?.originalDistanceOrScreenCoverage) {
				return;
			}

			let distance = lod.mesh.originalDistanceOrScreenCoverage;

			switch (quality) {
				case "very-low":
					distance = lod.mesh.originalDistanceOrScreenCoverage * 0.125;
					break;

				case "low":
					distance = lod.mesh.originalDistanceOrScreenCoverage * 0.25;
					break;

				case "medium":
					distance = lod.mesh.originalDistanceOrScreenCoverage * 0.5;
					break;
			}

			setMeshLodLevelDistance(mesh, index, distance);
		});
	});
}

/**
 * Returns wether or not the given mesh is a decal mesh created in the editor.
 * @param mesh defines the reference to the mesh to check the nature of.
 */
export function isDecalMesh(mesh: Mesh) {
	return (mesh.metadata?.decal ?? null) !== null;
}

/**
 * Sets wether or not the decal meshes created in the editor and belonging to a static group are enabled in the given scene.
 * @param enabled defines wether or not the decal meshes should be enabled.
 * @param scene defines the scene to update the decal meshes in.
 */
export function setStaticDecalsEnabled(enabled: boolean, scene: SceneContext) {
	getSceneData(scene).meshes.forEach((mesh) => {
		if (isDecalMesh(mesh) && isNodeFromStaticGroup(mesh)) {
			setNodeEnabled(mesh, enabled);
		}
	});
}

/**
 * Defines the bounding box of a mesh in world space.
 */
export interface IMeshWorldBoundingBox {
	minimum: Vec3;
	maximum: Vec3;
	center: Vec3;
	/**
	 * Defines the half size of the bounding box (Babylon.js `extendSizeWorld`).
	 */
	extendSize: Vec3;
}

/**
 * Computes the axis-aligned bounding box of the given mesh in world space, from its local bounding box.
 * @param mesh defines the reference to the mesh.
 */
export function getMeshWorldBoundingBox(mesh: Mesh): IMeshWorldBoundingBox {
	const m = mesh.worldMatrix;
	const localMin = mesh.boundMin ?? [0, 0, 0];
	const localMax = mesh.boundMax ?? [0, 0, 0];

	const minimum = { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: Number.MAX_VALUE };
	const maximum = { x: -Number.MAX_VALUE, y: -Number.MAX_VALUE, z: -Number.MAX_VALUE };

	for (let i = 0; i < 8; ++i) {
		const x = i & 1 ? localMax[0] : localMin[0];
		const y = i & 2 ? localMax[1] : localMin[1];
		const z = i & 4 ? localMax[2] : localMin[2];

		const wx = x * m[0] + y * m[4] + z * m[8] + m[12];
		const wy = x * m[1] + y * m[5] + z * m[9] + m[13];
		const wz = x * m[2] + y * m[6] + z * m[10] + m[14];

		minimum.x = Math.min(minimum.x, wx);
		minimum.y = Math.min(minimum.y, wy);
		minimum.z = Math.min(minimum.z, wz);

		maximum.x = Math.max(maximum.x, wx);
		maximum.y = Math.max(maximum.y, wy);
		maximum.z = Math.max(maximum.z, wz);
	}

	return {
		minimum,
		maximum,
		center: { x: (minimum.x + maximum.x) * 0.5, y: (minimum.y + maximum.y) * 0.5, z: (minimum.z + maximum.z) * 0.5 },
		extendSize: { x: (maximum.x - minimum.x) * 0.5, y: (maximum.y - minimum.y) * 0.5, z: (maximum.z - minimum.z) * 0.5 },
	};
}
