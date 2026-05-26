import { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

import { SceneLoaderQualitySelector } from "../loading/loader";

import { isMesh } from "./guards";
import { isNodeFromStaticGroup } from "./node";

declare module "@babylonjs/core/Meshes/abstractMesh" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface AbstractMesh {
		physicsAggregate?: PhysicsAggregate | null;
	}
}

declare module "@babylonjs/core/Meshes/mesh" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Mesh {
		originalDistanceOrScreenCoverage?: number;
	}
}

export function configureMeshDistanceOrScreenCoverage(scene: Scene) {
	scene.meshes.forEach((mesh) => {
		if (!isMesh(mesh)) {
			return;
		}

		mesh.getLODLevels().forEach((lod) => {
			if (lod.mesh) {
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
export function applyMeshesLODQuality(quality: SceneLoaderQualitySelector, scene: Scene) {
	scene.meshes.forEach((mesh) => {
		if (!isMesh(mesh)) {
			return;
		}

		mesh.getLODLevels().forEach((lod) => {
			if (!lod.mesh?.originalDistanceOrScreenCoverage) {
				return;
			}

			switch (quality) {
				case "very-low":
					lod.distanceOrScreenCoverage = lod.mesh.originalDistanceOrScreenCoverage * 0.125;
					break;

				case "low":
					lod.distanceOrScreenCoverage = lod.mesh.originalDistanceOrScreenCoverage * 0.25;
					break;

				case "medium":
					lod.distanceOrScreenCoverage = lod.mesh.originalDistanceOrScreenCoverage * 0.5;
					break;

				case "high":
					lod.distanceOrScreenCoverage = lod.mesh.originalDistanceOrScreenCoverage;
					break;
			}
		});
	});
}

/**
 * Returns wether or not the given mesh is a decal mesh created in the editor.
 * @param mesh defines the reference to the mesh to check the nature of.
 */
export function isDecalMesh(mesh: AbstractMesh) {
	return (mesh.metadata?.decal ?? null) !== null;
}

/**
 * Sets wether or not the decal meshes created in the editor and belonging to a static group are enabled in the given scene.
 * @param enabled defines wether or not the decal meshes should be enabled.
 * @param scene defines the scene to update the decal meshes in.
 */
export function setStaticDecalsEnabled(enabled: boolean, scene: Scene) {
	scene.meshes.forEach((mesh) => {
		if (isDecalMesh(mesh) && isNodeFromStaticGroup(mesh)) {
			mesh.setEnabled(enabled);
		}
	});
}
