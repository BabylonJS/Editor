import { join, basename } from "path/posix";
import { readJSON, readdir } from "fs-extra";

import { AbstractMesh, AnimationGroup, Camera, Color3, Light, SceneLoaderFlags, Texture, TransformNode, Animation, Color4, IParticleSystem, Vector3 } from "babylonjs";

import { Editor } from "../../editor/main";

import { EditorCamera } from "../../editor/nodes/camera";
import { SceneLinkNode } from "../../editor/nodes/scene-link";
import { SpriteMapNode } from "../../editor/nodes/sprite-map";
import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";

import { parseVLSPostProcess, vlsPostProcessCameraConfigurations } from "../../editor/rendering/vls";
import { parseSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssr";
import { parseSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssao";
import { parseMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations } from "../../editor/rendering/motion-blur";
import { parseDefaultRenderingPipeline, defaultPipelineCameraConfigurations } from "../../editor/rendering/default-pipeline";
import { iblShadowsRenderingPipelineCameraConfigurations, parseIblShadowsRenderingPipeline } from "../../editor/rendering/ibl-shadows";

import { createDirectoryIfNotExist } from "../../tools/fs";

import { createSceneLink } from "../../tools/scene/scene-link";
import { isCubeTexture, isTexture } from "../../tools/guards/texture";
import { updateIblShadowsRenderPipeline } from "../../tools/light/ibl";
import { forceCompileAllSceneMaterials } from "../../tools/scene/materials";
import { IAssetCache, loadSavedAssetsCache } from "../../tools/assets/cache";
import { checkProjectCachedCompressedTextures } from "../../tools/assets/ktx";
import { isAbstractMesh, isEditorCamera, isMesh } from "../../tools/guards/nodes";
import { updateAllLights, updatePointLightShadowMapRenderListPredicate } from "../../tools/light/shadows";

import { createNewSceneDefaultNodes } from "./default";
import { LoadSceneProgressComponent, showLoadSceneProgressDialog } from "./progress";

import { loadGuis } from "./plugins/gui";
import { loadMeshes } from "./plugins/meshes";
import { loadLights } from "./plugins/lights";
import { loadSounds } from "./plugins/sounds";
import { loadCameras } from "./plugins/cameras";
import { loadSkeletons } from "./plugins/skeletons";
import { loadSpriteMaps } from "./plugins/sprite-maps";
import { loadSpriteManagers } from "./plugins/sprite-managers";
import { loadTransformNodes } from "./plugins/transform-nodes";
import { loadParticleSystems } from "./plugins/particle-systems";
import { loadAnimationGroups } from "./plugins/animation-groups";
import { loadMorphTargetManagers } from "./plugins/morph-targets";
import { loadShadowGenerators } from "./plugins/shadow-generators";

import "./texture";

/**
 * Defines the list of all loaded scenes. This is used to detect cycle references
 * when computing scene links.
 */
const loadedScenes: string[] = [];

export type SceneLoaderOptions = {
	/**
	 * Defines wether or not the scene is being loaded as link.
	 */
	asLink?: boolean;
};

export type SceneLoadResult = {
	lights: Light[];
	cameras: Camera[];
	meshes: AbstractMesh[];
	sceneLinks: SceneLinkNode[];
	transformNodes: TransformNode[];
	animationGroups: AnimationGroup[];
	particleSystems: IParticleSystem[];
	spriteMaps: SpriteMapNode[];
	spriteManagers: SpriteManagerNode[];
};

export type ISceneLoaderPluginOptions = SceneLoaderOptions & {
	scenePath: string;
	relativeScenePath: string;
	projectPath: string;
	loadResult: SceneLoadResult;

	progress: LoadSceneProgressComponent;
	progressStep: number;

	assetsCache: Record<string, IAssetCache>;
};

export async function loadScene(editor: Editor, projectPath: string, scenePath: string, options?: SceneLoaderOptions): Promise<SceneLoadResult> {
	const scene = editor.layout.preview.scene;
	const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

	const loadResult = {
		lights: [],
		meshes: [],
		cameras: [],
		sceneLinks: [],
		transformNodes: [],
		animationGroups: [],
		particleSystems: [],
		spriteMaps: [],
		spriteManagers: [],
	} as SceneLoadResult;

	options ??= {};

	editor.layout.preview.setRenderScene(false);
	editor.layout.console.log(`Loading scene "${relativeScenePath}"`);

	// Prepare directories
	await Promise.all([
		createDirectoryIfNotExist(join(scenePath, "nodes")),
		createDirectoryIfNotExist(join(scenePath, "meshes")),
		createDirectoryIfNotExist(join(scenePath, "lods")),
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

	const [
		nodesFiles,
		meshesFiles,
		lodsFiles,
		lightsFiles,
		cameraFiles,
		skeletonFiles,
		shadowGeneratorFiles,
		sceneLinkFiles,
		guiFiles,
		soundFiles,
		particleSystemFiles,
		morphTargetManagerFiles,
		animationGroupFiles,
		spriteMapFiles,
		spriteManagerFiles,
	] = await Promise.all([
		readdir(join(scenePath, "nodes")),
		readdir(join(scenePath, "meshes")),
		readdir(join(scenePath, "lods")),
		readdir(join(scenePath, "lights")),
		readdir(join(scenePath, "cameras")),
		readdir(join(scenePath, "skeletons")),
		readdir(join(scenePath, "shadowGenerators")),
		readdir(join(scenePath, "sceneLinks")),
		readdir(join(scenePath, "gui")),
		readdir(join(scenePath, "sounds")),
		readdir(join(scenePath, "particleSystems")),
		readdir(join(scenePath, "morphTargetManagers")),
		readdir(join(scenePath, "animationGroups")),
		readdir(join(scenePath, "sprite-maps")),
		readdir(join(scenePath, "sprite-managers")),
	]);

	const progress = await showLoadSceneProgressDialog(`Loading ${basename(scenePath)}...`);
	const progressStep =
		100 /
		(nodesFiles.length +
			meshesFiles.length +
			lodsFiles.length +
			lightsFiles.length +
			cameraFiles.length +
			skeletonFiles.length +
			shadowGeneratorFiles.length +
			sceneLinkFiles.length +
			guiFiles.length +
			soundFiles.length +
			particleSystemFiles.length +
			morphTargetManagerFiles.length +
			animationGroupFiles.length +
			spriteMapFiles.length +
			spriteManagerFiles.length);

	SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

	const assetsCache = loadSavedAssetsCache();
	const config = await readJSON(join(scenePath, "config.json"), "utf-8");

	if (!options?.asLink) {
		// Metadata
		scene.metadata = config.metadata;

		// Load camera
		const camera = Camera.Parse(config.editorCamera, scene) as EditorCamera | null;

		if (camera) {
			editor.layout.preview.camera.dispose();
			editor.layout.preview.camera = camera;

			camera.attachControl(true);
			camera.configureFromPreferences();
		}

		// Load environment
		scene.environmentIntensity = config.environment.environmentIntensity;

		const environmentTexture = config.environment.environmentTexture;
		if (environmentTexture) {
			if (environmentTexture.name && assetsCache[environmentTexture.name]) {
				environmentTexture.name = assetsCache[environmentTexture.name].newRelativePath;
			}

			if (environmentTexture.url && assetsCache[environmentTexture.url]) {
				environmentTexture.url = assetsCache[environmentTexture.url].newRelativePath;
			}

			scene.environmentTexture = Texture.Parse(environmentTexture, scene, join(projectPath, "/"));

			if (isCubeTexture(scene.environmentTexture)) {
				scene.environmentTexture.url = join(projectPath, scene.environmentTexture.name);
			}
		}

		// Load fog
		scene.fogEnabled = config.fog.fogEnabled;
		scene.fogMode = config.fog.fogMode;
		scene.fogStart = config.fog.fogStart;
		scene.fogEnd = config.fog.fogEnd;
		scene.fogDensity = config.fog.fogDensity;
		scene.fogColor = Color3.FromArray(config.fog.fogColor);

		// Colors
		if (config.clearColor) {
			scene.clearColor = Color4.FromArray(config.clearColor);
		}

		if (config.ambientColor) {
			scene.ambientColor = Color3.FromArray(config.ambientColor);
		}

		// Physics
		if (config.physics) {
			scene.getPhysicsEngine()?.setGravity(Vector3.FromArray(config.physics.gravity));
		}
	}

	if (config.newScene) {
		createNewSceneDefaultNodes(editor, loadResult);
		delete config.newScene;
	}

	const pluginLoadOptions: ISceneLoaderPluginOptions = {
		projectPath,
		scenePath,
		relativeScenePath,
		loadResult,
		progress,
		progressStep,
		assetsCache,
		asLink: options.asLink,
	};

	await loadTransformNodes(editor, nodesFiles, scene, pluginLoadOptions);
	await loadSkeletons(editor, skeletonFiles, scene, pluginLoadOptions);
	await loadMeshes(meshesFiles, scene, pluginLoadOptions);
	await loadMorphTargetManagers(editor, morphTargetManagerFiles, scene, pluginLoadOptions);
	await loadLights(editor, lightsFiles, scene, pluginLoadOptions);
	await loadCameras(editor, cameraFiles, scene, pluginLoadOptions);

	if (!options?.asLink) {
		await loadShadowGenerators(editor, shadowGeneratorFiles, scene, pluginLoadOptions);
	}

	await loadGuis(editor, guiFiles, pluginLoadOptions);
	await loadSounds(editor, soundFiles, scene, pluginLoadOptions);
	await loadParticleSystems(editor, particleSystemFiles, scene, pluginLoadOptions);
	await loadAnimationGroups(editor, animationGroupFiles, scene, pluginLoadOptions);
	await loadSpriteMaps(editor, spriteMapFiles, scene, pluginLoadOptions);
	await loadSpriteManagers(editor, spriteManagerFiles, scene, pluginLoadOptions);

	// Configure textures urls
	scene.textures.forEach((texture) => {
		if (isTexture(texture) || isCubeTexture(texture)) {
			texture.url = texture.name;
		}
	});

	// Configure lights
	scene.lights.forEach((light) => {
		updatePointLightShadowMapRenderListPredicate(light);
	});

	// Configure LODs
	scene.meshes.forEach((mesh) => {
		if (!mesh._waitingData.lods || !isMesh(mesh)) {
			return;
		}

		const masterMesh = scene.getMeshById(mesh._waitingData.lods.masterMeshId);
		if (masterMesh && isMesh(masterMesh)) {
			mesh.material = masterMesh.material;
			masterMesh.addLODLevel(mesh._waitingData.lods.distanceOrScreenCoverage, mesh);
		}

		mesh._waitingData.lods = null;
	});

	// Scene animations
	scene.animations ??= [];
	config.animations?.forEach((data) => {
		scene.animations.push(Animation.Parse(data));
	});

	// Scene animation groups
	// TODO: legacy
	config.animationGroups?.forEach((data) => {
		const group = AnimationGroup.Parse(data, scene);
		if (group.targetedAnimations.length === 0) {
			group.dispose();
		} else {
			loadResult.animationGroups.push(group);
		}
	});

	// Load scene links
	loadedScenes.push(relativeScenePath);

	for (const file of sceneLinkFiles) {
		try {
			const data = await readJSON(join(scenePath, "sceneLinks", file), "utf-8");

			if (options?.asLink && data.metadata?.doNotSerialize) {
				continue;
			}

			if (loadedScenes.includes(data._relativePath)) {
				editor.layout.console.error(`Can't load scene "${data._relativePath}": cycle references detected.`);
				continue;
			}

			const sceneLink = await createSceneLink(editor, join(projectPath, data._relativePath));
			if (sceneLink) {
				sceneLink.parse(data);

				sceneLink.uniqueId = data.uniqueId;
				sceneLink.metadata ??= {};
				sceneLink.metadata._waitingParentId = data.parentId;

				loadResult.sceneLinks.push(sceneLink);
			}
		} catch (e) {
			editor.layout.console.error(`Failed to load scene link file "${file}": ${e.message}`);
		}

		progress.step(progressStep);
	}

	loadedScenes.pop();

	// Configure waiting parent ids.
	const allNodes = [...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];

	allNodes.forEach((n) => {
		if ((n.metadata?._waitingParentId ?? null) === null) {
			return;
		}

		const transformNode = scene.getTransformNodeByUniqueId(n.metadata._waitingParentId as any);
		if (transformNode) {
			return (n.parent = transformNode);
		}

		const mesh = scene.getMeshByUniqueId(n.metadata._waitingParentId as any);
		if (mesh) {
			return (n.parent = mesh);
		}

		const light = scene.getLightByUniqueId(n.metadata._waitingParentId as any);
		if (light) {
			return (n.parent = light);
		}

		const camera = scene.getCameraByUniqueId(n.metadata._waitingParentId as any);
		if (camera) {
			return (n.parent = camera);
		}
	});

	if (!options?.asLink) {
		allNodes.forEach((n) => {
			if (n.metadata) {
				delete n.metadata._waitingParentId;
			}

			if (isAbstractMesh(n)) {
				n.refreshBoundingInfo(true, true);
			}
		});

		// For each camera
		const postProcessConfigurations = Array.isArray(config.rendering) ? config.rendering : [];

		postProcessConfigurations.forEach((configuration) => {
			const camera = scene.getCameraById(configuration.cameraId);
			if (!camera) {
				return;
			}

			ssaoRenderingPipelineCameraConfigurations.set(camera, configuration.ssao2RenderingPipeline);
			vlsPostProcessCameraConfigurations.set(camera, configuration.vlsPostProcess);
			ssrRenderingPipelineCameraConfigurations.set(camera, configuration.ssrRenderingPipeline);
			motionBlurPostProcessCameraConfigurations.set(camera, configuration.motionBlurPostProcess);
			defaultPipelineCameraConfigurations.set(camera, configuration.defaultRenderingPipeline);
			iblShadowsRenderingPipelineCameraConfigurations.set(camera, configuration.iblShadowsRenderPipeline);

			if (isEditorCamera(camera)) {
				if (configuration.iblShadowsRenderPipeline) {
					parseIblShadowsRenderingPipeline(editor, configuration.iblShadowsRenderPipeline);
				}

				if (configuration.ssao2RenderingPipeline) {
					parseSSAO2RenderingPipeline(editor, configuration.ssao2RenderingPipeline);
				}

				if (configuration.vlsPostProcess) {
					parseVLSPostProcess(editor, configuration.vlsPostProcess);
				}

				if (configuration.ssrRenderingPipeline) {
					parseSSRRenderingPipeline(editor, configuration.ssrRenderingPipeline);
				}

				if (configuration.motionBlurPostProcess) {
					parseMotionBlurPostProcess(editor, configuration.motionBlurPostProcess);
				}

				if (configuration.defaultRenderingPipeline) {
					parseDefaultRenderingPipeline(editor, configuration.defaultRenderingPipeline);
				}
			}
		});
	}

	setTimeout(() => {
		updateAllLights(scene);
		updateIblShadowsRenderPipeline(scene, true);

		if (!options.asLink) {
			checkProjectCachedCompressedTextures(editor);
			editor.layout.preview.setRenderScene(true);
		}
	}, 150);

	if (!options?.asLink) {
		progress.setName("Compiling materials...");
		await forceCompileAllSceneMaterials(scene);
	}

	progress.dispose();

	editor.layout.console.log("Scene loaded and editor is ready.");

	return loadResult;
}
