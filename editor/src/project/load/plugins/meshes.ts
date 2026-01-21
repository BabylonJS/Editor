import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, Constants, Matrix, Mesh, SceneLoader, MultiMaterial, Geometry } from "babylonjs";

import { ISceneLoaderPluginOptions } from "../scene";

import { wait } from "../../../tools/tools";
import { isCollisionMesh, isMesh } from "../../../tools/guards/nodes";
import { isMultiMaterial, isNodeMaterial } from "../../../tools/guards/material";
import { parsePhysicsAggregate } from "../../../tools/physics/serialization/aggregate";
import { configureSimultaneousLightsForMaterial, normalizeNodeMaterialUniqueIds } from "../../../tools/material/material";

import { CollisionMesh } from "../../../editor/nodes/collision";

export async function loadMeshes(meshesFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedMeshes = await Promise.all(
		meshesFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			const initialData = await readJSON(join(options.scenePath, "meshes", file), "utf-8");

			if (options?.asLink && initialData.metadata?.doNotSerialize) {
				return;
			}

			const filesToLoad = [join(options.relativeScenePath, "meshes", file), ...(initialData.lods?.map((file) => join(options.relativeScenePath, "lods", file)) ?? [])];

			return await Promise.all(
				filesToLoad.map(async (filename, index) => {
					const result = await SceneLoader.ImportMeshAsync("", join(options.projectPath, "/"), filename, scene, null, ".babylon");
					const meshes = result.meshes.filter((m) => isMesh(m)) as Mesh[];

					const data = index === 0 ? initialData : await readJSON(join(options.projectPath, filename), "utf-8");

					while (meshes.find((m) => m.delayLoadState && m.delayLoadState !== Constants.DELAYLOADSTATE_LOADED)) {
						await wait(150);
					}

					result.meshes.forEach((m) => {
						if (!isMesh(m)) {
							return;
						}

						const meshData = data.meshes?.find((d) => d.id === m.id);

						if (data.basePoseMatrix) {
							m.updatePoseMatrix(Matrix.FromArray(data.basePoseMatrix));
						}

						if ((meshData?.uniqueId ?? null) !== null) {
							m.uniqueId = meshData.uniqueId;

							m.metadata ??= {};
							m.metadata._waitingParentId = meshData.metadata?.parentId;

							delete m.metadata.parentId;
						}

						// Handle physics
						if (meshData?.metadata?.physicsAggregate) {
							m.physicsAggregate = parsePhysicsAggregate(m, meshData.metadata.physicsAggregate);
							m.physicsAggregate.body.disableSync = true;
						}

						m.instances.forEach((instance) => {
							const instanceData = meshData.instances?.find((d) => d.id === instance.id);
							if (instanceData) {
								if ((instanceData?.uniqueId ?? null) !== null) {
									instance.id = instanceData.id;
								}

								if ((instanceData?.uniqueId ?? null) !== null) {
									instance.uniqueId = instanceData.uniqueId;
								}

								instance.metadata ??= {};
								instance.metadata._waitingParentId = instanceData.metadata?.parentId;

								delete instance.metadata.parentId;

								if (instanceData.metadata?.physicsAggregate) {
									instance.physicsAggregate = parsePhysicsAggregate(instance, instanceData.metadata.physicsAggregate);
									instance.physicsAggregate.body.disableSync = true;
								}
							}

							options.loadResult.meshes.push(instance);
						});

						// Handle case the data is a collision mesh
						if (data.isCollisionMesh) {
							const collisionMesh = CollisionMesh.CreateFromSourceMesh(m, data.collisionMeshType);

							m.dispose(true, false);
							m = collisionMesh;

							if (!isCollisionMesh(m)) {
								return;
							}
						}

						options.loadResult.meshes.push(m);

						if (m.material) {
							const material = isMultiMaterial(m.material)
								? data.multiMaterials?.find((d) => d.id === m.material!.id)
								: data.materials?.find((d) => d.id === m.material!.id);

							if (material) {
								m.material.uniqueId = material.uniqueId;
							}

							if (isMultiMaterial(m.material)) {
								m.material.subMaterials.forEach((subMaterial, index) => {
									if (!subMaterial) {
										return;
									}

									const material = data.materials?.find((d) => d.id === subMaterial.id);
									if (material) {
										subMaterial.uniqueId = material.uniqueId;
									}

									configureSimultaneousLightsForMaterial(subMaterial);

									const existingMaterial = scene.materials.find((material) => {
										return material !== m.material && material.uniqueId === m.material!.uniqueId;
									});

									if (existingMaterial) {
										subMaterial.dispose(false, true);
										(m.material as MultiMaterial).subMaterials[index] = existingMaterial;
									}
								});
							} else {
								configureSimultaneousLightsForMaterial(m.material);

								const existingMaterial = scene.materials.find((material) => {
									return material !== m.material && material.uniqueId === m.material!.uniqueId;
								});

								if (existingMaterial) {
									m.material.dispose(false, false);
									m.material = existingMaterial;
								} else if (isNodeMaterial(m.material)) {
									normalizeNodeMaterialUniqueIds(m.material, material);
								}
							}
						}

						if (m.geometry) {
							if (meshData?.geometryId) {
								m.geometry.id = meshData.geometryId;
							}

							if (meshData?.geometryUniqueId) {
								m.geometry.uniqueId = meshData.geometryUniqueId;
							}
						}
					});

					if (index > 0) {
						// const data = await readJSON(join(projectPath, filename), "utf-8");

						if (data.masterMeshId && data.distanceOrScreenCoverage !== undefined) {
							meshes[0]._waitingData.lods = {
								masterMeshId: data.masterMeshId,
								distanceOrScreenCoverage: data.distanceOrScreenCoverage,
							};
						}
					}

					options.progress.step(options.progressStep);

					return result.meshes;
				})
			);
		})
	);

	// Make geometries unique for those one that are shared
	const mappedGeometries = new Map<string, Geometry[]>();
	scene.geometries.forEach((geometry) => {
		if (!mappedGeometries.has(geometry.id)) {
			mappedGeometries.set(geometry.id, [geometry]);
		} else {
			mappedGeometries.get(geometry.id)!.push(geometry);
		}
	});

	mappedGeometries.forEach((geometries) => {
		if (geometries.length <= 1) {
			return;
		}

		for (let i = 1, len = geometries.length; i < len; ++i) {
			const geometry = geometries[i];
			const meshes = scene.meshes.filter((mesh) => isMesh(mesh) && mesh.geometry === geometry) as Mesh[];

			meshes.forEach((mesh) => {
				geometry.releaseForMesh(mesh, true);
				if (geometry.isDisposed()) {
					scene.removeGeometry(geometry);
				}

				geometries[0].applyToMesh(mesh);
			});
		}
	});

	// Re-add meshes to keep correct order
	const floatLoadedMeshes = loadedMeshes.flat(2);
	floatLoadedMeshes.forEach((mesh) => {
		if (mesh) {
			scene.removeMesh(mesh);
			scene.addMesh(mesh);

			if (isMesh(mesh) && mesh.instances) {
				mesh.instances.forEach((instance) => {
					scene.removeMesh(instance);
					scene.addMesh(instance);
				});
			}
		}
	});
}
