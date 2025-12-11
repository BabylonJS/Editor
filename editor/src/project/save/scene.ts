import { join, basename } from "path/posix";
import { readJSON, remove, stat, writeFile, writeJSON } from "fs-extra";

import filenamify from "filenamify";

import { RenderTargetTexture, SceneSerializer } from "babylonjs";

import { Editor } from "../../editor/main";

import { isSceneLinkNode } from "../../tools/guards/scene";
import { applyAssetsCache } from "../../tools/assets/cache";
import { isNodeVisibleInGraph } from "../../tools/node/metadata";
import { getBufferSceneScreenshot } from "../../tools/scene/screenshot";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";
import { isSpriteManagerNode, isSpriteMapNode } from "../../tools/guards/sprites";
import { isGPUParticleSystem, isParticleSystem } from "../../tools/guards/particles";
import { serializePhysicsAggregate } from "../../tools/physics/serialization/aggregate";
import { isAnimationGroupFromSceneLink, isFromSceneLink } from "../../tools/scene/scene-link";
import { isAnyTransformNode, isCollisionMesh, isEditorCamera, isMesh, isTransformNode } from "../../tools/guards/nodes";

import { vlsPostProcessCameraConfigurations } from "../../editor/rendering/vls";
import { saveRenderingConfigurationForCamera } from "../../editor/rendering/tools";
import { ssrRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssr";
import { ssaoRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssao";
import { defaultPipelineCameraConfigurations } from "../../editor/rendering/default-pipeline";
import { motionBlurPostProcessCameraConfigurations } from "../../editor/rendering/motion-blur";
import { iblShadowsRenderingPipelineCameraConfigurations } from "../../editor/rendering/ibl-shadows";

import { writeBinaryGeometry } from "../tools/geometry";
import { writeBinaryMorphTarget } from "../tools/morph-target";

import { showSaveSceneProgressDialog } from "./dialog";

export async function saveScene(editor: Editor, projectPath: string, scenePath: string): Promise<void> {
	const fStat = await stat(scenePath);
	if (!fStat.isDirectory()) {
		return editor.layout.console.error("The scene path is not a directory.");
	}

	const dialog = await showSaveSceneProgressDialog(editor, "Saving scene...");

	const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

	await Promise.all([
		createDirectoryIfNotExist(join(scenePath, "lods")),
		createDirectoryIfNotExist(join(scenePath, "nodes")),
		createDirectoryIfNotExist(join(scenePath, "meshes")),
		createDirectoryIfNotExist(join(scenePath, "lights")),
		createDirectoryIfNotExist(join(scenePath, "cameras")),
		createDirectoryIfNotExist(join(scenePath, "geometries")),
		createDirectoryIfNotExist(join(scenePath, "skeletons")),
		createDirectoryIfNotExist(join(scenePath, "shadowGenerators")),
		createDirectoryIfNotExist(join(scenePath, "sceneLinks")),
		createDirectoryIfNotExist(join(scenePath, "gui")),
		createDirectoryIfNotExist(join(scenePath, "sounds")),
		createDirectoryIfNotExist(join(scenePath, "particleSystems")),
		createDirectoryIfNotExist(join(scenePath, "morphTargetManagers")),
		createDirectoryIfNotExist(join(scenePath, "morphTargets")),
		createDirectoryIfNotExist(join(scenePath, "animationGroups")),
		createDirectoryIfNotExist(join(scenePath, "sprite-maps")),
		createDirectoryIfNotExist(join(scenePath, "sprite-managers")),
	]);

	const scene = editor.layout.preview.scene;
	const meshesToSave = scene.meshes.filter((mesh) => {
		if ((!isMesh(mesh) && !isCollisionMesh(mesh)) || mesh._masterMesh || isFromSceneLink(mesh) || !isNodeVisibleInGraph(mesh)) {
			return false;
		}

		return true;
	});

	const progressStep =
		100 /
		(meshesToSave.length +
			scene.transformNodes.length +
			scene.lights.length +
			scene.cameras.length +
			scene.particleSystems.length +
			scene.skeletons.length +
			scene.morphTargetManagers.length +
			scene.animationGroups.length);

	const savedFiles: string[] = [];
	const savedGeometryIds: string[] = [];

	// Write geometries and meshes
	await Promise.all(
		meshesToSave.map(async (mesh) => {
			if ((!isMesh(mesh) && !isCollisionMesh(mesh)) || mesh._masterMesh || isFromSceneLink(mesh) || !isNodeVisibleInGraph(mesh)) {
				return;
			}

			const meshes = [mesh, ...mesh.getLODLevels().map((lodLevel) => lodLevel.mesh)];

			const results = await Promise.all(
				meshes.map(async (meshToSerialize) => {
					if (!meshToSerialize) {
						return null;
					}

					const data = await SceneSerializer.SerializeMesh(meshToSerialize, false, false);
					delete data.skeletons;

					if (meshToSerialize._masterMesh) {
						delete data.materials;
					}

					data.metadata = meshToSerialize.metadata;
					data.basePoseMatrix = meshToSerialize.getPoseMatrix().asArray();

					// Handle case where the mesh is a collision mesh
					if (isCollisionMesh(meshToSerialize)) {
						data.isCollisionMesh = true;
						data.collisionMeshType = meshToSerialize.type;

						data.meshes?.forEach((meshData: any) => {
							meshData.type = "Mesh";
						});

						delete data.materials;
					}

					data.meshes?.forEach((mesh) => {
						if (mesh.renderOverlay) {
							mesh.renderOverlay = false;
						}

						if (mesh.overlayAlpha) {
							mesh.overlayAlpha = 1;
						}

						if (mesh.overlayColor) {
							mesh.overlayColor = [0, 0, 0];
						}

						const instantiatedMesh = scene.getMeshById(mesh.id);
						if (instantiatedMesh?.parent) {
							mesh.metadata ??= {};
							mesh.metadata.parentId = instantiatedMesh.parent.uniqueId;

							delete mesh.parentId;
						}

						if (!instantiatedMesh?.material) {
							delete mesh.materialUniqueId;
						}

						mesh.instances?.forEach((instanceData: any) => {
							const instance = meshToSerialize.instances.find((instance) => instance.id === instanceData.id);
							if (instance) {
								if (instance.parent) {
									instanceData.metadata ??= {};
									instanceData.metadata.parentId = instance.parent.uniqueId;
								}

								instanceData.uniqueId = instance.uniqueId;

								delete instanceData.parentId;

								if (instance?.physicsAggregate) {
									instanceData.metadata ??= {};
									instanceData.metadata.physicsAggregate = serializePhysicsAggregate(instance.physicsAggregate);
								}
							}
						});

						if (instantiatedMesh?.physicsAggregate) {
							mesh.metadata ??= {};
							mesh.metadata.physicsAggregate = serializePhysicsAggregate(instantiatedMesh.physicsAggregate);
						}
					});

					const lodLevel = mesh.getLODLevels().find((lodLevel) => lodLevel.mesh === meshToSerialize);
					if (lodLevel) {
						data.masterMeshId = mesh.id;
						data.distanceOrScreenCoverage = lodLevel.distanceOrScreenCoverage;
					}

					await Promise.all(
						data.meshes?.map(async (mesh) => {
							const instantiatedMesh = scene.getMeshById(mesh.id);
							const geometry = data.geometries?.vertexData?.find((v) => v.id === mesh.geometryId);

							if (geometry) {
								const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;

								mesh.delayLoadingFile = join(relativeScenePath, `geometries/${geometryFileName}`);
								mesh.boundingBoxMaximum = instantiatedMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
								mesh.boundingBoxMinimum = instantiatedMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
								mesh._binaryInfo = {};

								const geometryPath = join(scenePath, "geometries", geometryFileName);

								try {
									let writeGeometry = false;
									if (!savedGeometryIds.includes(geometry.id)) {
										writeGeometry = true;
										savedGeometryIds.push(geometry.id);
									}

									await writeBinaryGeometry({
										mesh,
										geometry,
										path: geometryPath,
										write: writeGeometry,
									});

									let geometryIndex = -1;
									do {
										geometryIndex = data.geometries!.vertexData!.findIndex((g) => g.id === mesh.geometryId);
										if (geometryIndex !== -1) {
											data.geometries!.vertexData!.splice(geometryIndex, 1);
										}
									} while (geometryIndex !== -1);
								} catch (e) {
									editor.layout.console.error(`Failed to write geometry for mesh ${mesh.name}`);
								} finally {
									savedFiles.push(geometryPath);
								}
							}
						})
					);

					return data;
				})
			);

			await Promise.all(
				results
					.slice(0)
					.reverse()
					.map(async (result, index) => {
						if (!result) {
							return;
						}

						let meshPath: string;
						if (result === results[0]) {
							meshPath = join(scenePath, "meshes", `${mesh.id}.json`);
						} else {
							meshPath = join(scenePath, "lods", `${mesh.id}-lod${index}.json`);
							results[0].lods ??= [];
							results[0].lods.push(basename(meshPath));
						}

						try {
							await writeJSON(meshPath, result, {
								spaces: 4,
							});
						} catch (e) {
							editor.layout.console.error(`Failed to write mesh ${mesh.name}`);
						} finally {
							savedFiles.push(meshPath);
						}
					})
			);

			dialog.step(progressStep);
		})
	);

	// Write skeletons
	await Promise.all(
		scene.skeletons.map(async (skeleton) => {
			const meshes = scene.meshes.filter((m) => m.skeleton === skeleton && !isFromSceneLink(m));
			if (!meshes.length) {
				return;
			}

			const skeletonPath = join(scenePath, "skeletons", `${skeleton.id}.json`);

			try {
				await writeJSON(skeletonPath, skeleton.serialize(), {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write skeleton ${skeleton.name}`);
			} finally {
				savedFiles.push(skeletonPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write morph targets
	await Promise.all(
		scene.meshes.map(async (mesh) => {
			if (!mesh.morphTargetManager || isFromSceneLink(mesh) || !isNodeVisibleInGraph(mesh)) {
				return;
			}

			const morphTargetManagerPath = join(scenePath, "morphTargetManagers", `${mesh.id}.json`);

			try {
				const data = mesh.morphTargetManager.serialize();
				data.meshId = mesh.id;
				data.uniqueId = mesh.morphTargetManager.uniqueId;

				await Promise.all(
					data.targets.map(async (target, targetIndex) => {
						const effectiveTarget = mesh.morphTargetManager!.getTarget(targetIndex);
						if (effectiveTarget) {
							target.uniqueId = effectiveTarget.uniqueId;
						}

						const morphTargetFileName = `${target.id}.babylonbinarymeshdata`;
						const targetPath = join(scenePath, "morphTargets", morphTargetFileName);

						target.delayLoadingFile = join(relativeScenePath, `morphTargets/${morphTargetFileName}`);

						try {
							await writeBinaryMorphTarget(targetPath, target);
						} catch (e) {
							editor.layout.console.error(`Failed to write morph target binary geometry for mesh ${mesh.name}`);
						} finally {
							savedFiles.push(targetPath);
						}
					})
				);

				await writeJSON(morphTargetManagerPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write morph target manager for mesh ${mesh.name}`);
			} finally {
				savedFiles.push(morphTargetManagerPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write transform nodes
	await Promise.all(
		scene.transformNodes.map(async (transformNode) => {
			if (!isTransformNode(transformNode) || isFromSceneLink(transformNode)) {
				return;
			}

			const transformNodePath = join(scenePath, "nodes", `${transformNode.id}.json`);

			try {
				const data = transformNode.serialize();

				data.metadata ??= {};
				data.metadata.parentId = transformNode.parent?.uniqueId;

				delete data.parentId;

				await writeJSON(transformNodePath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write transform node ${transformNode.name}`);
			} finally {
				savedFiles.push(transformNodePath);
			}

			dialog.step(progressStep);
		})
	);

	// Write lights
	await Promise.all(
		scene.lights.map(async (light) => {
			if (isFromSceneLink(light)) {
				return;
			}

			const lightPath = join(scenePath, "lights", `${light.id}.json`);

			try {
				const data = light.serialize();

				data.metadata ??= {};
				data.metadata.parentId = light.parent?.uniqueId;

				delete data.parentId;

				await writeJSON(lightPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write light ${light.name}`);
			} finally {
				savedFiles.push(lightPath);
			}

			const shadowGenerator = light.getShadowGenerator();
			if (shadowGenerator) {
				const shadowGeneratorPath = join(scenePath, "shadowGenerators", `${shadowGenerator.id}.json`);

				try {
					const shadowGeneratorData = shadowGenerator.serialize();
					shadowGeneratorData.refreshRate = shadowGenerator.getShadowMap()?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;

					await writeJSON(shadowGeneratorPath, shadowGeneratorData, {
						spaces: 4,
					});
				} catch (e) {
					editor.layout.console.error(`Failed to write shadow generator for light ${light.name}`);
				} finally {
					savedFiles.push(shadowGeneratorPath);
				}
			}

			dialog.step(progressStep);
		})
	);

	// Write cameras
	await Promise.all(
		scene.cameras.map(async (camera) => {
			if (isEditorCamera(camera) || isFromSceneLink(camera)) {
				return;
			}

			const cameraPath = join(scenePath, "cameras", `${camera.id}.json`);

			try {
				const data = camera.serialize();

				data.metadata ??= {};
				data.metadata.parentId = camera.parent?.uniqueId;

				delete data.parentId;

				await writeJSON(cameraPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write camera ${camera.name}`);
			} finally {
				savedFiles.push(cameraPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write scene links
	await Promise.all(
		scene.transformNodes.map(async (transformNode) => {
			if (!isSceneLinkNode(transformNode)) {
				return;
			}

			const sceneLinkPath = join(scenePath, "sceneLinks", `${transformNode.id}.json`);

			try {
				await writeJSON(sceneLinkPath, transformNode.serialize(), {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write scene link node ${transformNode.name}`);
			} finally {
				savedFiles.push(sceneLinkPath);
			}

			dialog.step(progressStep);
		})
	);

	// Save scene files
	const guiTextures = scene.textures.filter((texture) => texture.getClassName() === "AdvancedDynamicTexture");
	if (guiTextures.length) {
		const allGuiFiles = await normalizedGlob(join(projectPath, "assets/**/*.gui"), {
			nodir: true,
		});

		const guiConfigurations = await Promise.all(
			allGuiFiles.map(async (file) => {
				const data = await readJSON(file, {
					encoding: "utf8",
				});

				return {
					file,
					uniqueId: data.uniqueId,
				};
			})
		);

		await Promise.all(
			guiTextures.map(async (guiTexture) => {
				const absolutePath = guiConfigurations.find((config) => config.uniqueId === guiTexture.uniqueId)?.file;
				const relativePath = absolutePath?.replace(join(projectPath, "assets", "/"), "");

				if (relativePath) {
					const guiPath = join(scenePath, "gui", `${guiTexture.uniqueId}.json`);

					try {
						await writeJSON(
							guiPath,
							{
								relativePath,
								name: guiTexture.name,
							},
							{
								spaces: 4,
							}
						);
					} catch (e) {
						editor.layout.console.error(`Failed to write gui node ${guiTexture.name}`);
					} finally {
						savedFiles.push(guiPath);
					}
				}
			})
		);
	}

	// Write sounds
	const soundtracks = scene.soundTracks ?? [];

	await Promise.all(
		soundtracks.map(async (soundtrack) => {
			await Promise.all(
				soundtrack.soundCollection.map(async (sound) => {
					const soundPath = join(scenePath, "sounds", `${sound.id}.json`);

					try {
						await writeJSON(
							soundPath,
							{
								...sound.serialize(),
								id: sound.id,
								uniqueId: sound.uniqueId,
							},
							{
								spaces: 4,
							}
						);
					} catch (e) {
						editor.layout.console.error(`Failed to write scene link node ${sound.name}`);
					} finally {
						savedFiles.push(soundPath);
					}
				})
			);
		})
	);

	// Write particle systems
	await Promise.all(
		scene.particleSystems.map(async (particleSystem) => {
			const particleSystemPath = join(scenePath, "particleSystems", `${particleSystem.id}.json`);

			const emitter = particleSystem.emitter;
			if (emitter && isAnyTransformNode(emitter) && isFromSceneLink(emitter)) {
				return;
			}

			try {
				const data = particleSystem.serialize(true);

				if (isParticleSystem(particleSystem) || isGPUParticleSystem(particleSystem)) {
					data.uniqueId = particleSystem.uniqueId;
				}

				data.className = particleSystem.getClassName();
				data.sourceParticleSystemSetId = particleSystem.sourceParticleSystemSetId;

				await writeJSON(particleSystemPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write particle system ${particleSystem.name}`);
			} finally {
				savedFiles.push(particleSystemPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write animation groups
	await Promise.all(
		scene.animationGroups?.map(async (animationGroup) => {
			if (isAnimationGroupFromSceneLink(animationGroup)) {
				return;
			}

			const animationGroupPath = join(scenePath, "animationGroups", `${filenamify(animationGroup.name)}_${animationGroup.uniqueId}.json`);

			try {
				const data = animationGroup.serialize();
				data.uniqueId = animationGroup.uniqueId;

				await writeJSON(animationGroupPath, data);
			} catch (e) {
				editor.layout.console.error(`Failed to write particle system ${animationGroup.name}`);
			} finally {
				savedFiles.push(animationGroupPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write sprite maps
	await Promise.all(
		scene.transformNodes.map(async (transformNode) => {
			if (!isSpriteMapNode(transformNode) || isFromSceneLink(transformNode)) {
				return;
			}

			const spriteMapPath = join(scenePath, "sprite-maps", `${transformNode.id}.json`);

			try {
				const data = transformNode.serialize();

				data.metadata ??= {};
				data.metadata.parentId = transformNode.parent?.uniqueId;

				delete data.parentId;

				await writeJSON(spriteMapPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write sprite map node ${transformNode.name}`);
			} finally {
				savedFiles.push(spriteMapPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write sprite managers
	await Promise.all(
		scene.transformNodes.map(async (transformNode) => {
			if (!isSpriteManagerNode(transformNode) || isFromSceneLink(transformNode)) {
				return;
			}

			const spriteManagerPath = join(scenePath, "sprite-managers", `${transformNode.id}.json`);

			try {
				const data = transformNode.serialize();

				data.metadata ??= {};
				data.metadata.parentId = transformNode.parent?.uniqueId;

				delete data.parentId;

				await writeJSON(spriteManagerPath, data, {
					spaces: 4,
				});
			} catch (e) {
				editor.layout.console.error(`Failed to write sprite manager node ${transformNode.name}`);
			} finally {
				savedFiles.push(spriteManagerPath);
			}

			dialog.step(progressStep);
		})
	);

	// Write configuration
	const configPath = join(scenePath, "config.json");

	try {
		if (scene.activeCamera) {
			saveRenderingConfigurationForCamera(scene.activeCamera);
		}

		await writeJSON(
			configPath,
			{
				clearColor: scene.clearColor.asArray(),
				ambientColor: scene.ambientColor.asArray(),
				environment: {
					environmentIntensity: scene.environmentIntensity,
					environmentTexture: scene.environmentTexture
						? {
								...scene.environmentTexture.serialize(),
								url: scene.environmentTexture.name,
							}
						: undefined,
				},
				fog: {
					fogEnabled: scene.fogEnabled,
					fogMode: scene.fogMode,
					fogStart: scene.fogStart,
					fogEnd: scene.fogEnd,
					fogDensity: scene.fogDensity,
					fogColor: scene.fogColor.asArray(),
				},
				physics: {
					gravity: scene.getPhysicsEngine()?.gravity?.asArray(),
				},
				rendering: scene.cameras.map((camera) => ({
					cameraId: camera.id,
					ssao2RenderingPipeline: ssaoRenderingPipelineCameraConfigurations.get(camera),
					vlsPostProcess: vlsPostProcessCameraConfigurations.get(camera),
					ssrRenderingPipeline: ssrRenderingPipelineCameraConfigurations.get(camera),
					motionBlurPostProcess: motionBlurPostProcessCameraConfigurations.get(camera),
					defaultRenderingPipeline: defaultPipelineCameraConfigurations.get(camera),
					iblShadowsRenderPipeline: iblShadowsRenderingPipelineCameraConfigurations.get(camera),
				})),
				metadata: scene.metadata,
				editorCamera: {
					...editor.layout.preview.camera.serialize(),
					uniqueId: undefined,
				},
				animations: scene.animations.map((animation) => animation.serialize()),
			},
			{
				spaces: 4,
			}
		);
	} catch (e) {
		editor.layout.console.error(`Failed to write configuration.`);
	} finally {
		savedFiles.push(configPath);
	}

	dialog.dispose();

	// Remove old files
	const files = await normalizedGlob(join(scenePath, "/**"), {
		nodir: true,
	});

	await Promise.all(
		files.map(async (file) => {
			if (savedFiles.includes(file)) {
				return;
			}

			await remove(file);
		})
	);

	// Update screenshot
	getBufferSceneScreenshot(scene).then((screenshotBuffer) => {
		writeFile(join(scenePath, "preview.png"), screenshotBuffer);
	});

	// Update material files
	const materialFiles = await normalizedGlob(join(projectPath, "/**/*.material"), {
		nodir: true,
	});

	await Promise.all(
		materialFiles.map(async (file) => {
			const data = await readJSON(file);
			const uniqueId = data.uniqueId;

			if (!uniqueId) {
				return;
			}

			const material = scene.materials.find((material) => material.uniqueId === uniqueId);
			if (!material) {
				return;
			}

			await writeJSON(file, material.serialize(), {
				spaces: "\t",
				encoding: "utf-8",
			});
		})
	);

	// Update assets cache in all scenes and assets files.
	await applyAssetsCache();
}
