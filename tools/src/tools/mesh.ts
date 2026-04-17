import { Scene } from "@babylonjs/core/scene";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

import { SceneLoaderQualitySelector } from "../loading/loader";

import { isMesh } from "./guards";

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
		if (isMesh(mesh)) {
			mesh.getLODLevels().forEach((lod) => {
				if (lod.mesh) {
					lod.mesh.originalDistanceOrScreenCoverage = lod.distanceOrScreenCoverage;
				}
			});
		}
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
		if (isMesh(mesh)) {
			mesh.getLODLevels().forEach((lod) => {
				if (lod.mesh?.originalDistanceOrScreenCoverage) {
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
				}
			});
		}
	});
}
