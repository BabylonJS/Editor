import { Scene, AbstractMesh, Vector3, Quaternion, Mesh, InstancedMesh, Tools, Geometry } from "babylonjs";

import { isInstancedMesh, isMesh } from "../../../tools/guards/nodes";
import { setNodeSerializable, setNodeVisibleInGraph } from "../../../tools/node/metadata";

import { INavMeshObstacleConfiguration, INavMeshStaticMeshConfiguration } from "./types";

export function getStaticMeshes(scene: Scene, configurations: INavMeshStaticMeshConfiguration[], useLowestLods: boolean) {
	const clonedMeshes: AbstractMesh[] = [];
	const clonedGeometries: Geometry[] = [];

	const computedGeometries: Geometry[] = [];

	const staticMeshes = configurations
		.filter((config) => config.enabled)
		.map((config) => {
			const mesh = scene.getNodeById(config.id) as Mesh | InstancedMesh | null;
			if (!mesh) {
				return null;
			}

			mesh.computeWorldMatrix(true);

			let clone: Mesh | null = null;
			let effectiveMesh: Mesh | null = null;

			// LOD levels are drawn using the world matrix of the mesh (or instance) they belong to. The lowest one comes first.
			const sourceMesh = isInstancedMesh(mesh) ? mesh.sourceMesh : mesh;
			const lowestLodMesh = useLowestLods ? sourceMesh.getLODLevels().find((lodLevel) => lodLevel.mesh)?.mesh : null;

			if (lowestLodMesh || isInstancedMesh(mesh)) {
				clone = (lowestLodMesh ?? sourceMesh).clone("mergedClone", null, true, false);
				effectiveMesh = clone;
			} else {
				effectiveMesh = mesh;
			}

			if (mesh.getWorldMatrix().determinant() < 0) {
				const oldClone = clone;
				clone = effectiveMesh.clone("mergedClone", null, true, false);
				oldClone?.dispose(true, false);

				if (clone.geometry && !computedGeometries.includes(clone.geometry!)) {
					const clonedGeometry = clone.geometry.copy(Tools.RandomId());
					clonedGeometry.applyToMesh(clone);

					if (clonedGeometry) {
						const indices = clonedGeometry.getIndices()?.slice();
						if (indices) {
							for (let i = 0; i < indices.length; i += 3) {
								const tmp = indices[i + 1];
								indices[i + 1] = indices[i + 2];
								indices[i + 2] = tmp;
							}

							clonedGeometry.setIndices(indices);
							computedGeometries.push(clone.geometry);
						}

						clonedGeometries.push(clonedGeometry);
					}
				}
			}

			if (clone) {
				clone.metadata = null;
				clone.parent = mesh.parent;
				clone.position.copyFrom(mesh.position);
				clone.rotation.copyFrom(mesh.rotation);
				clone.scaling.copyFrom(mesh.scaling);

				// The clone has the rotation quaternion of the mesh it comes from (source mesh, LOD level), if any.
				clone.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? null;

				clone.setEnabled(false);

				setNodeSerializable(clone, false);
				setNodeVisibleInGraph(clone, false);

				clonedMeshes.push(clone);
			}

			return clone ?? effectiveMesh;
		});

	const effectiveStaticMeshes = staticMeshes.filter((mesh) => mesh !== null);

	return {
		clonedMeshes,
		clonedGeometries,
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
