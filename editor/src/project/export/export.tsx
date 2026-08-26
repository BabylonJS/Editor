import { join, dirname, basename, extname } from "path/posix";
import { readJSON, readdir, remove, writeFile, writeJSON } from "fs-extra";

import { RenderTargetTexture, SceneSerializer, GaussianSplattingMesh } from "babylonjs";

import { toast } from "sonner";

import { isNodeMaterial } from "../../tools/guards/material";
import { isHDRCubeTexture } from "../../tools/guards/texture";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { storeTexturesBaseSize } from "../../tools/material/texture";
import { extractNodeMaterialTextures } from "../../tools/material/extract";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";
import { extractNodeParticleSystemSetTextures, extractParticleSystemTextures } from "../../tools/particles/extract";
import { isCollisionMesh, isEditorCamera, isGaussianSplattingPartProxyMesh, isMesh } from "../../tools/guards/nodes";

import { taaPipelineCameraConfigurations } from "../../editor/rendering/taa";
import { vlsPostProcessCameraConfigurations } from "../../editor/rendering/vls";
import { saveRenderingConfigurationForCamera } from "../../editor/rendering/tools";
import { ssrRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssr";
import { ssaoRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssao";
import { defaultPipelineCameraConfigurations } from "../../editor/rendering/default-pipeline";
import { motionBlurPostProcessCameraConfigurations } from "../../editor/rendering/motion-blur";

import { Editor } from "../../editor/main";

import { writeBinaryGeometry } from "../tools/geometry";

import { processAssetFile } from "./assets";
import { configureMeshesLODs } from "./lod";
import { handleExportScripts } from "./scripts";
import { configureMaterials } from "./materials";
import { configureMeshesPhysics } from "./physics";
import { configureClusteredLights } from "./light";
import { configureParticleSystems } from "./particles";
import { EditorExportProjectProgressComponent } from "./progress";
import { ExportSceneProgressComponent, showExportSceneProgressDialog } from "./dialog";

export type IExportProjectOptions = {
	optimize: boolean;
	debugMode: boolean;
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
		console.error(e);

		editor.layout.console.error(`Error exporting project:\n ${(e as Error).message}`);
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
	const clusteredLightContainer = editor.layout.preview.clusteredLightContainer;

	if (scene.activeCamera) {
		saveRenderingConfigurationForCamera(scene.activeCamera);
	}

	const projectDir = dirname(editor.state.projectPath);
	const publicPath = join(projectDir, "public");

	const sceneName = basename(editor.state.lastOpenedScenePath).split(".").shift()!;

	const scenePath = join(publicPath, "scene");
	const extractedTexturesOutputPath = join(scenePath, "assets", "editor-generated_extracted-textures");

	await Promise.all([
		createDirectoryIfNotExist(publicPath),
		createDirectoryIfNotExist(scenePath),
		createDirectoryIfNotExist(join(scenePath, sceneName)),
		createDirectoryIfNotExist(extractedTexturesOutputPath),
	]);

	const exportedAssets: string[] = [];

	const savedGeometries: string[] = [];
	const savedGeometryIds: string[] = [];

	storeTexturesBaseSize(scene);

	scene.meshes.forEach((mesh) => (mesh.doNotSerialize = ((mesh.metadata?.doNotSerialize ?? false) || mesh.reservedDataStore?.hidden) ?? false));
	scene.lights.forEach((light) => (light.doNotSerialize = light.metadata?.doNotSerialize ?? false));
	scene.cameras.forEach((camera) => (camera.doNotSerialize = camera.metadata?.doNotSerialize ?? false));
	scene.transformNodes.forEach((transformNode) => (transformNode.doNotSerialize = transformNode.metadata?.doNotSerialize ?? false));
	clusteredLightContainer.lights.forEach((light) => (light.doNotSerialize = light.metadata?.doNotSerialize ?? false));

	const data = await SceneSerializer.SerializeAsync(scene);

	scene.meshes.forEach((mesh) => (mesh.doNotSerialize = false));
	scene.lights.forEach((light) => (light.doNotSerialize = false));
	scene.cameras.forEach((camera) => (camera.doNotSerialize = false));
	scene.transformNodes.forEach((transformNode) => (transformNode.doNotSerialize = false));
	clusteredLightContainer.lights.forEach((light) => (light.doNotSerialize = false));

	const editorCameraIndex = data.cameras?.findIndex((camera: any) => camera.id === editorCamera?.id);
	if (editorCameraIndex !== -1) {
		data.cameras?.splice(editorCameraIndex, 1);
	}

	const clusteredLightContainerIndex = data.lights?.findIndex((light: any) => light.id === clusteredLightContainer.id);
	if (clusteredLightContainerIndex !== -1) {
		data.lights?.splice(clusteredLightContainerIndex, 1);
	}

	data.metadata ??= {};

	data.metadata.rendering = scene.cameras
		.filter((camera) => !isEditorCamera(camera))
		.map((camera) => ({
			cameraId: camera.id,
			ssao2RenderingPipeline: ssaoRenderingPipelineCameraConfigurations.get(camera),
			vlsPostProcess: vlsPostProcessCameraConfigurations.get(camera),
			ssrRenderingPipeline: ssrRenderingPipelineCameraConfigurations.get(camera),
			motionBlurPostProcess: motionBlurPostProcessCameraConfigurations.get(camera),
			defaultRenderingPipeline: defaultPipelineCameraConfigurations.get(camera),
			taaRenderingPipeline: taaPipelineCameraConfigurations.get(camera),
		}));

	delete data.effectLayers;
	delete data.postProcesses;
	delete data.spriteManagers;

	data.metadata.physicsGravity = scene.getPhysicsEngine()?.gravity?.asArray();

	configureMaterials(data);
	configureMeshesLODs(data, scene);
	configureMeshesPhysics(data, scene);
	configureParticleSystems(data, scene);
	configureClusteredLights(data, clusteredLightContainer);

	// Configure environment texture
	if (isHDRCubeTexture(scene.environmentTexture)) {
		data.environmentTextureSize = 512;
		data.environmentTextureType = "BABYLON.HDRCubeTexture";
		data.environmentTextureRotationY = scene.environmentTexture.rotationY;
	}

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

						mesh.instances?.forEach((instance: any) => {
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
					mesh.instances?.forEach((instance: any) => {
						instance.checkCollisions = true;
					});
				}
			}

			const geometry = data.geometries?.vertexData?.find((v: any) => v.id === mesh.geometryId);

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
						geometryIndex = data.geometries!.vertexData!.findIndex((g: any) => g.id === mesh.geometryId);
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

	// Add gaussian splatting meshes to the list
	const computedGaussianSplattingMeshes: GaussianSplattingMesh[] = [];

	await Promise.all(
		scene.meshes.map(async (mesh) => {
			if (!isGaussianSplattingPartProxyMesh(mesh) || !mesh.baseGaussianSplattingMesh?.splatsData) {
				return;
			}

			if (computedGaussianSplattingMeshes.includes(mesh.baseGaussianSplattingMesh)) {
				return;
			}

			computedGaussianSplattingMeshes.push(mesh.baseGaussianSplattingMesh);

			const splatDataPath = join(scenePath, sceneName, `${mesh.baseGaussianSplattingMesh.id}.babylonbinarysplatdata`);
			const shPaths = mesh.baseGaussianSplattingMesh.shData?.map((_, index) =>
				join(scenePath, sceneName, `${mesh.baseGaussianSplattingMesh!.id}-sh${index}.babylonbinarysplatshdata`)
			);

			try {
				const promises = [writeFile(splatDataPath, Buffer.from(mesh.baseGaussianSplattingMesh.splatsData))];

				mesh.baseGaussianSplattingMesh.shData?.forEach((shData, index) => {
					promises.push(writeFile(shPaths![index], Buffer.from(shData)));
				});

				await Promise.all(promises);

				const gaussianSplatData = mesh.baseGaussianSplattingMesh.serialize(
					{
						proxies: [],
						metadata: mesh.metadata,
						isEnabled: mesh.isEnabled(false),
						splatDataPath: `${sceneName}/${mesh.baseGaussianSplattingMesh.id}.babylonbinarysplatdata`,
						shDataPaths: mesh.baseGaussianSplattingMesh.shData?.map(
							(_, index) => `${sceneName}/${mesh.baseGaussianSplattingMesh!.id}-sh${index}.babylonbinarysplatshdata`
						),
					},
					"binary"
				);

				delete gaussianSplatData.shData;
				delete gaussianSplatData.splatsData;

				const allMeshProxies = scene.meshes.filter((m) => isGaussianSplattingPartProxyMesh(m) && m.baseGaussianSplattingMesh === mesh.baseGaussianSplattingMesh);
				allMeshProxies.forEach((proxy) => {
					const proxyData = proxy.serialize();
					proxyData.parentId = proxy.parent?.id;
					delete proxyData.compoundSplatMeshId;
					gaussianSplatData.proxies.push(proxyData);
				});

				data.meshes?.push(gaussianSplatData);

				savedGeometries.push(`${mesh.baseGaussianSplattingMesh.id}.babylonbinarysplatdata`);

				mesh.baseGaussianSplattingMesh.shData?.forEach((_, index) => {
					savedGeometries.push(`${mesh.baseGaussianSplattingMesh!.id}-sh${index}.babylonbinarysplatshdata`);
				});
			} catch (e) {
				editor.layout.console.error(`Export: Failed to write gaussian splatting data for mesh ${mesh.name}`);
			}
		})
	);

	// Configure lights
	data.shadowGenerators?.forEach((shadowGenerator: any) => {
		const instantiatedLight = scene.getLightById(shadowGenerator.lightId);
		const instantiatedShadowGenerator = instantiatedLight?.getShadowGenerator();

		const light = data.lights?.find((light: any) => light.id === shadowGenerator.lightId);
		if (light && instantiatedShadowGenerator) {
			light.metadata ??= {};
			light.metadata.refreshRate = instantiatedShadowGenerator?.getShadowMap()?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
		}
	});

	// Extract textures from particle systems.
	await Promise.all(
		data.particleSystems?.map(async (particleSystemData: any) => {
			const result = await extractParticleSystemTextures(editor, particleSystemData, {
				assetsDirectory: extractedTexturesOutputPath,
			});

			if (result) {
				exportedAssets.push(join(scenePath, result.relativePath));
			}
		})
	);

	// Extract textures from node materials.
	const nodeMaterials = data.materials?.filter((materialData: any) => {
		const existingMaterial = scene.getMaterialById(materialData.id);
		return existingMaterial && isNodeMaterial(existingMaterial);
	});

	if (nodeMaterials.length) {
		await Promise.all(
			nodeMaterials.map(async (materialData: any) => {
				const relativePaths = await extractNodeMaterialTextures(editor, {
					materialData,
					assetsDirectory: extractedTexturesOutputPath,
				});

				exportedAssets.push(...relativePaths.map((path) => join(scenePath, path)));
			})
		);
	}

	// Extract texture from node particle systems.
	const nodeParticleSystems = data.meshes?.filter((meshData: any) => {
		return meshData.isNodeParticleSystemMesh && meshData.nodeParticleSystemSet;
	});

	if (nodeParticleSystems.length) {
		await Promise.all(
			nodeParticleSystems.map(async (meshData: any) => {
				const relativePaths = await extractNodeParticleSystemSetTextures(editor, {
					assetsDirectory: extractedTexturesOutputPath,
					particlesData: meshData.nodeParticleSystemSet,
				});

				exportedAssets.push(...relativePaths.map((path) => join(scenePath, path)));
			})
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
	await handleExportScripts(editor, options.debugMode);

	// Export assets
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
