import { join, dirname, basename, extname } from "path/posix";
import { readJSON, readdir, remove, writeJSON } from "fs-extra";

import { RenderTargetTexture, SceneSerializer } from "babylonjs";

import { toast } from "sonner";

import { isTexture } from "../../tools/guards/texture";
import { isNodeMaterial } from "../../tools/guards/material";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { extractNodeMaterialTextures } from "../../tools/material/extract";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";
import { isCollisionMesh, isEditorCamera, isMesh } from "../../tools/guards/nodes";
import { extractNodeParticleSystemSetTextures, extractParticleSystemTextures } from "../../tools/particles/extract";

import { saveRenderingConfigurationForCamera } from "../../editor/rendering/tools";
import { serializeVLSPostProcess, vlsPostProcessCameraConfigurations } from "../../editor/rendering/vls";
import { serializeSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssr";
import { serializeSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssao";
import { motionBlurPostProcessCameraConfigurations, serializeMotionBlurPostProcess } from "../../editor/rendering/motion-blur";
import { defaultPipelineCameraConfigurations, serializeDefaultRenderingPipeline } from "../../editor/rendering/default-pipeline";

import { Editor } from "../../editor/main";

import { writeBinaryGeometry } from "../tools/geometry";

import { processAssetFile } from "./assets";
import { configureMeshesLODs } from "./lod";
import { handleExportScripts } from "./scripts";
import { configureMaterials } from "./materials";
import { configureMeshesPhysics } from "./physics";
import { configureParticleSystems } from "./particles";
import { EditorExportProjectProgressComponent } from "./progress";
import { ExportSceneProgressComponent, showExportSceneProgressDialog } from "./dialog";

export type IExportProjectOptions = {
	optimize: boolean;
	noDialog?: boolean;
	noProgress?: boolean;
};

let exporting = false;

export async function exportProject(editor: Editor, options: IExportProjectOptions): Promise<void> {
	if (exporting) {
		return;
	}

	exporting = true;

	if (options.optimize) {
		editor.layout.selectTab("console");
	}

	try {
		await _exportProject(editor, options);
	} catch (e) {
		console.log(e);

		editor.layout.console.error(`Error exporting project:\n ${e.message}`);
		toast.error("Error exporting project");
	} finally {
		exporting = false;
	}
}

async function _exportProject(editor: Editor, options: IExportProjectOptions): Promise<void> {
	if (!editor.state.projectPath || !editor.state.lastOpenedScenePath) {
		return;
	}

	let progress: EditorExportProjectProgressComponent | null = null;
	const toastId = toast(<EditorExportProjectProgressComponent ref={(r) => (progress = r)} />, {
		dismissible: false,
		duration: options.noProgress ? -1 : Infinity,
	});

	let dialog: ExportSceneProgressComponent | null = null;
	if (!options.noDialog) {
		dialog = await showExportSceneProgressDialog(editor, "Exporting scene...");
	}

	const scene = editor.layout.preview.scene;
	const editorCamera = scene.cameras.find((camera) => isEditorCamera(camera));

	if (scene.activeCamera) {
		saveRenderingConfigurationForCamera(scene.activeCamera);
	}

	const projectDir = dirname(editor.state.projectPath);
	const publicPath = join(projectDir, "public");

	const savedGeometries: string[] = [];
	const savedGeometryIds: string[] = [];

	const extractedTexturesOutputPath = join(projectDir, "assets", "editor-generated_extracted-textures");

	// Extract textures from particle systems.
	if (scene.particleSystems.length) {
		await createDirectoryIfNotExist(extractedTexturesOutputPath);
		await extractParticleSystemTextures(editor, {
			assetsDirectory: extractedTexturesOutputPath,
		});
	}

	// Configure textures to store base size. This will be useful for the scene loader located
	// in the `babylonjs-editor-tools` package.
	scene.textures.forEach((texture) => {
		if (isTexture(texture)) {
			texture.metadata ??= {};
			texture.metadata.baseSize = {
				width: texture.getBaseSize().width,
				height: texture.getBaseSize().height,
			};
		}
	});

	scene.meshes.forEach((mesh) => (mesh.doNotSerialize = mesh.metadata?.doNotSerialize ?? false));
	scene.lights.forEach((light) => (light.doNotSerialize = light.metadata?.doNotSerialize ?? false));
	scene.cameras.forEach((camera) => (camera.doNotSerialize = camera.metadata?.doNotSerialize ?? false));
	scene.transformNodes.forEach((transformNode) => (transformNode.doNotSerialize = transformNode.metadata?.doNotSerialize ?? false));

	const data = await SceneSerializer.SerializeAsync(scene);

	scene.meshes.forEach((mesh) => (mesh.doNotSerialize = false));
	scene.lights.forEach((light) => (light.doNotSerialize = false));
	scene.cameras.forEach((camera) => (camera.doNotSerialize = false));
	scene.transformNodes.forEach((transformNode) => (transformNode.doNotSerialize = false));

	const editorCameraIndex = data.cameras?.findIndex((camera) => camera.id === editorCamera?.id);
	if (editorCameraIndex !== -1) {
		data.cameras?.splice(editorCameraIndex, 1);
	}

	data.metadata ??= {};
	data.metadata.rendering = {
		ssrRenderingPipeline: serializeSSRRenderingPipeline(),
		motionBlurPostProcess: serializeMotionBlurPostProcess(),
		ssao2RenderingPipeline: serializeSSAO2RenderingPipeline(),
		defaultRenderingPipeline: serializeDefaultRenderingPipeline(),
		vlsPostProcess: serializeVLSPostProcess(),
	};

	data.metadata.rendering = scene.cameras
		.filter((camera) => !isEditorCamera(camera))
		.map((camera) => ({
			cameraId: camera.id,
			ssao2RenderingPipeline: ssaoRenderingPipelineCameraConfigurations.get(camera),
			vlsPostProcess: vlsPostProcessCameraConfigurations.get(camera),
			ssrRenderingPipeline: ssrRenderingPipelineCameraConfigurations.get(camera),
			motionBlurPostProcess: motionBlurPostProcessCameraConfigurations.get(camera),
			defaultRenderingPipeline: defaultPipelineCameraConfigurations.get(camera),
		}));

	delete data.postProcesses;
	delete data.spriteManagers;

	data.metadata.physicsGravity = scene.getPhysicsEngine()?.gravity?.asArray();

	configureMaterials(data);
	configureMeshesLODs(data, scene);
	configureMeshesPhysics(data, scene);
	configureParticleSystems(data, scene);

	const sceneName = basename(editor.state.lastOpenedScenePath).split(".").shift()!;

	await createDirectoryIfNotExist(publicPath);
	await createDirectoryIfNotExist(join(publicPath, "scene"));
	await createDirectoryIfNotExist(join(publicPath, "scene", sceneName));

	const scenePath = join(publicPath, "scene");

	// Write all geometries as incremental. This makes the scene way less heavy as binary saved geometry
	// is not stored in the JSON scene file. Moreover, this may allow to load geometries on the fly compared
	// to single JSON file.
	await Promise.all(
		data.meshes?.map(async (mesh: any) => {
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

			if (instantiatedMesh) {
				if (isMesh(instantiatedMesh)) {
					const collisionMesh = getCollisionMeshFor(instantiatedMesh);
					if (collisionMesh) {
						mesh.isPickable = false;
						mesh.checkCollisions = false;

						mesh.instances?.forEach((instance) => {
							instance.isPickable = false;
							instance.checkCollisions = false;
						});
					}
				}

				if (isCollisionMesh(instantiatedMesh)) {
					if (mesh.materialId) {
						const materialIndex = data.materials.findIndex((material: any) => {
							return material.id === mesh.materialId;
						});

						if (materialIndex !== -1) {
							data.materials.splice(materialIndex);
						}
					}

					mesh.checkCollisions = true;
					mesh.instances?.forEach((instance) => {
						instance.checkCollisions = true;
					});
				}
			}

			const geometry = data.geometries?.vertexData?.find((v) => v.id === mesh.geometryId);

			if (geometry) {
				const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;

				mesh.delayLoadingFile = `${sceneName}/${geometryFileName}`;
				mesh.boundingBoxMaximum = instantiatedMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
				mesh.boundingBoxMinimum = instantiatedMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
				mesh._binaryInfo = {};

				const geometryPath = join(scenePath, sceneName, geometryFileName);

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

					savedGeometries.push(geometryFileName);
				} catch (e) {
					editor.layout.console.error(`Export: Failed to write geometry for mesh ${mesh.name}`);
				}
			}
		})
	);

	// Configure lights
	data.shadowGenerators?.forEach((shadowGenerator) => {
		const instantiatedLight = scene.getLightById(shadowGenerator.lightId);
		const instantiatedShadowGenerator = instantiatedLight?.getShadowGenerator();

		const light = data.lights?.find((light) => light.id === shadowGenerator.lightId);
		if (light && instantiatedShadowGenerator) {
			light.metadata ??= {};
			light.metadata.refreshRate = instantiatedShadowGenerator?.getShadowMap()?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
		}
	});

	// Configure sounds
	data.sounds?.forEach((sound) => {
		const instantiatedSound = scene.getSoundByName(sound.name);
		if (instantiatedSound) {
			sound.id = instantiatedSound.id;
			sound.uniqueId = instantiatedSound.uniqueId;
		}
	});

	// Extract textures from node materials.
	const nodeMaterials = data.materials?.filter((materialData) => {
		const existingMaterial = scene.getMaterialById(materialData.id);
		return existingMaterial && isNodeMaterial(existingMaterial);
	});

	if (nodeMaterials.length) {
		await createDirectoryIfNotExist(extractedTexturesOutputPath);
		await Promise.all(
			nodeMaterials.map(async (materialData) =>
				extractNodeMaterialTextures(editor, {
					materialData,
					assetsDirectory: extractedTexturesOutputPath,
				})
			)
		);
	}

	// Extract texture from node particle systems.
	const nodeParticleSystems = data.meshes?.filter((meshData) => {
		return meshData.isNodeParticleSystemMesh && meshData.nodeParticleSystemSet;
	});

	if (nodeParticleSystems.length) {
		await createDirectoryIfNotExist(extractedTexturesOutputPath);
		await Promise.all(
			nodeParticleSystems.map(async (meshData) =>
				extractNodeParticleSystemSetTextures(editor, {
					assetsDirectory: extractedTexturesOutputPath,
					particlesData: meshData.nodeParticleSystemSet,
				})
			)
		);
	}

	// Write final scene file.
	await writeJSON(join(scenePath, `${sceneName}.babylon`), data);

	// Clear old geometries
	const geometriesDir = join(scenePath, sceneName);
	const geometriesFiles = await readdir(geometriesDir);

	await Promise.all(
		geometriesFiles.map(async (file) => {
			if (!savedGeometries.includes(file)) {
				await remove(join(geometriesDir, file));
			}
		})
	);

	// Copy files
	const files = await normalizedGlob(join(projectDir, "/assets/**/*"), {
		nodir: true,
		ignore: {
			childrenIgnored: (p) => extname(p.name) === ".scene",
		},
	});

	// Export scripts
	await handleExportScripts(editor);

	// Export assets
	const exportedAssets: string[] = [];
	const promises: Promise<void>[] = [];
	const progressStep = 100 / files.length;

	let cache: Record<string, string> = {};
	try {
		cache = await readJSON(join(projectDir, "assets/.export-cache.json"));
	} catch (e) {
		// Catch silently.
	}

	for (const file of files) {
		if (promises.length >= 5) {
			await Promise.all(promises);
			promises.length = 0;
		}

		promises.push(
			new Promise<void>(async (resolve) => {
				await processAssetFile(editor, file.toString(), {
					cache,
					scenePath,
					projectDir,
					exportedAssets,
					optimize: options.optimize,
				});
				progress?.step(progressStep);
				dialog?.step(progressStep);
				resolve();
			})
		);
	}

	await Promise.all(promises);

	await writeJSON(join(projectDir, "assets/.export-cache.json"), cache, {
		encoding: "utf-8",
		spaces: "\t",
	});

	toast.dismiss(toastId);
	dialog?.dispose();

	if (options.optimize) {
		toast.success("Project exported");

		const publicFiles = await normalizedGlob(join(projectDir, "/public/scene/assets/**/*"), {
			nodir: true,
		});

		publicFiles.forEach((file) => {
			if (!exportedAssets.includes(file.toString())) {
				remove(file);
			}
		});
	}
}
