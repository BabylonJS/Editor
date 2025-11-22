import { Scene, AbstractMesh, Vector3, Quaternion } from "babylonjs";

import { isInstancedMesh, isMesh } from "../../../tools/guards/nodes";
import { setNodeSerializable, setNodeVisibleInGraph } from "../../../tools/node/metadata";

import { INavMeshObstacleConfiguration, INavMeshStaticMeshConfiguration } from "./types";

export function getStaticMeshes(scene: Scene, configurations: INavMeshStaticMeshConfiguration[]) {
	const clonedMeshes: AbstractMesh[] = [];

	const staticMeshes = configurations
		.filter((config) => config.enabled)
		.map((config) => {
			const mesh = scene.getNodeById(config.id);
			if (!mesh || isMesh(mesh)) {
				return mesh;
			}

			if (isInstancedMesh(mesh)) {
				const clone = mesh.sourceMesh.clone("mergedClone", null, true, false);
				clone.metadata = null;
				clone.position.copyFrom(mesh.position);
				clone.rotation.copyFrom(mesh.rotation);
				clone.scaling.copyFrom(mesh.scaling);

				if (mesh.rotationQuaternion) {
					clone.rotationQuaternion = mesh.rotationQuaternion.clone();
				}

				clone.setEnabled(false);

				setNodeSerializable(clone, false);
				setNodeVisibleInGraph(clone, false);

				clonedMeshes.push(clone);

				return clone;
			}

			return null;
		});

	const effectiveStaticMeshes = staticMeshes.filter((mesh) => mesh !== null);

	return {
		clonedMeshes,
		effectiveStaticMeshes,
	};
}

export function getObstacleMeshes(scene: Scene, configurations: INavMeshObstacleConfiguration[]) {
	const position = Vector3.Zero();
	const rotationQuaternion = Quaternion.Identity();
	const scaling = Vector3.One();

	const obstacleMeshes = configurations
		.filter((config) => config.enabled)
		.map((config) => {
			const mesh = scene.getNodeById(config.id);
			if (!mesh) {
				return null;
			}

			const effectiveMesh = isMesh(mesh) ? mesh : isInstancedMesh(mesh) ? mesh.sourceMesh : null;

			if (!effectiveMesh) {
				return null;
			}

			const matrix = mesh.computeWorldMatrix(true);
			matrix.decompose(scaling, rotationQuaternion, position);

			const clone = effectiveMesh.clone("obstacleClone", null, true, false);
			clone.parent = null;
			clone.metadata = null;
			clone.position.copyFrom(position);
			clone.scaling.copyFrom(scaling);
			clone.rotationQuaternion = rotationQuaternion.clone();

			setNodeSerializable(clone, false);
			setNodeVisibleInGraph(clone, false);

			return {
				clone,
				config,
			};
		});

	return obstacleMeshes.filter((mesh) => mesh !== null);
}
