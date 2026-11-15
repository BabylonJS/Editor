import { PhysicsWorld, rebuildSceneRenderables, registerScene, registerSceneWithShadowSupport, SceneContext, setPhysicsGravity, unregisterScene } from "@babylonjs/lite";

import { getSceneData } from "../tools/scene";
import { loadJsonFile } from "../tools/request";
import { applyMeshesLODQuality, configureMeshDistanceOrScreenCoverage } from "../tools/mesh";
import { configureShadowMapRefreshRate, configureShadowMapRenderListPredicate } from "../tools/light";

import { IScript } from "../script";

import { _buildSceneRenderTasks } from "../rendering/pipeline";
import { applyRenderingConfigurationForCamera, IApplyRenderingConfigurationOptions } from "../rendering/tools";

import { configurePhysicsAggregate } from "./physics";
import { _attachOfflineDatabase } from "./database/database";
import { parseBabylonScene } from "./scene-parser";
import { applyRenderingConfigurations } from "./rendering";
import { configureTransformNodes } from "./transform-node";

import { _applyScriptsForObject } from "./script/apply";
import { _preloadScriptsAssets } from "./script/preload";

/**
 * Defines the possible output type of a script.
 * `default` is a class that will be instantiated with the object as parameter.
 * `onStart` is a function that will be called once before the first render passing the reference to the object the script is attached to.
 * `onUpdate` is a function that will be called every frame passing the reference to the object the script is attached to
 */
export type ScriptMap = Record<
	string,
	{
		default?: new (object: any) => IScript;
	} & IScript
>;

/**
 * Defines the overall desired quality of the scene.
 * In other words, defines the quality of textures that will be loaded in terms of dimensions.
 * The editor computes automatic "high (untouched)", "medium (half)", and "low (quarter)" quality levels for textures.
 * Using "medium" or "low" quality levels will reduce the memory usage and improve the performance of the scene
 * especially on mobiles where memory is limited.
 */
export type SceneLoaderQualitySelector = "very-low" | "low" | "medium" | "high";

export type SceneLoaderOptions = {
	/**
	 * Defines the quality of the scene.
	 * This will affect the quality of textures that will be loaded in terms of dimensions.
	 * The editor computes automatic "high (untouched)", "medium (half)", and "low (quarter)" quality levels for textures.
	 * Using "medium" or "low" quality levels will reduce the memory usage and improve the performance of the scene
	 * especially on mobiles where memory is limited. The "very-low" quality level is even more aggressive with shadows quality.
	 */
	quality?: SceneLoaderQualitySelector;

	/**
	 * Same as "quality" but only applied to textures. If set, this has priority over "quality".
	 */
	texturesQuality?: SceneLoaderQualitySelector;
	/**
	 * Same as "quality" but only applied to shadows. If set, this has priority over "quality".
	 */
	shadowsQuality?: SceneLoaderQualitySelector;
	/**
	 * Sames as "quality" but only applied to LODs. If set, this has priority over "quality".
	 * This will affect the screen coverage or distance used to switch between LODs. The "very-low" quality level is even more aggressive with LODs.
	 */
	lodsQuality?: SceneLoaderQualitySelector;

	/**
	 * Defines the optional configuration to apply when applying the rendering configuration for a camera.
	 * This allows to selectively disable some post-processes when applying the rendering configuration for a camera.
	 * This is particularly useful for when your game provides options to enable/disable post-processes.
	 */
	postProcessConfiguration?: IApplyRenderingConfigurationOptions;

	/**
	 * Defines the function called to notify the loading progress in interval [0, 1]
	 */
	onProgress?: (value: number) => void;

	/**
	 * Defines whether to skip the preloading of assets linked to scripts.
	 * To ensure all resources are loaded before resolving loadScene promise, all resources linked to scripts are preloaded after the scene is loaded.
	 * To bypass this behavior, you can set this flag to true.
	 * @default false
	 */
	skipAssetsPreload?: boolean;

	/**
	 * Defines the physics world used to create the physics aggregates of the meshes (Babylon Lite has no physics engine
	 * attached to the scene). The world is typically created using `createHavokWorld(scene, await HavokPhysics())`.
	 * When not set, the physics world previously given to the scene is used, and the physics aggregates are not
	 * created if the scene has no physics world.
	 */
	physicsWorld?: PhysicsWorld | null;

	/**
	 * Defines the URL of the BRDF lookup texture used by the environment of the scene (required by Babylon Lite).
	 * By default, the BRDF lookup texture of Babylon.js, embedded in the tools, is used.
	 */
	brdfUrl?: string;

	/**
	 * Defines whether to skip the registration of the scene. Babylon Lite renders only the registered scenes: by default
	 * the scene is registered once loaded (with the support of shadows when it contains shadow generators). Set this
	 * flag to true to register the scene yourself, for example to add your own frame graph tasks before.
	 * @default false
	 */
	doNotRegisterScene?: boolean;
};

const shadowSupportedScenes = new WeakSet<SceneContext>();

/**
 * Registers the given scene so Babylon Lite renders it, or rebuilds its renderables when it was already registered
 * (typically when several editor scenes are loaded in the same scene): Babylon Lite bakes the lights and shadows
 * topology in the renderables of the meshes when the scene is built.
 */
async function registerLoadedScene(scene: SceneContext): Promise<void> {
	const hasShadows = scene.lights.some((light) => light.shadowGenerator);
	const isBuilt = (scene as { _built?: boolean })._built === true;

	if (!isBuilt) {
		if (hasShadows) {
			shadowSupportedScenes.add(scene);
			await registerSceneWithShadowSupport(scene);
		} else {
			await registerScene(scene);
		}

		return;
	}

	if (hasShadows && !shadowSupportedScenes.has(scene)) {
		shadowSupportedScenes.add(scene);

		// Registering the scene again installs the shadows task and rebuilds the renderables.
		unregisterScene(scene);
		await registerSceneWithShadowSupport(scene);
		return;
	}

	await rebuildSceneRenderables(scene);
}

/**
 * Loads the given scene file (`.babylon` file saved by the editor in the `public/scene` folder of the project) and
 * appends its content to the given Babylon Lite scene: meshes, materials, lights, shadows, cameras, sounds, sprites,
 * particles, physics, animations, scripts, etc. The scene is registered at the end of the loading (see
 * `SceneLoaderOptions.doNotRegisterScene`) so it is rendered as soon as the engine is started using `startEngine`.
 * To use the post-processes configured in the editor, create the scene using `createEditorSceneContext`.
 * The features of Babylon.js not supported by Babylon Lite are listed in MISSING_FEATURES.md.
 * @param rootUrl defines the root url of the scene (where the assets are located), ie. "/scene/".
 * @param sceneFilename defines the name of the scene file to load, ie. "example.babylon".
 * @param scene defines the reference to the Babylon Lite scene where to append the content of the scene file.
 * @param scriptsMap defines the map of all the scripts available in the project (generated by the editor in "src/scripts.ts").
 * @param options defines the options of the loading.
 */
export async function loadScene(rootUrl: string, sceneFilename: string, scene: SceneContext, scriptsMap: ScriptMap, options?: SceneLoaderOptions) {
	scene.loadingQuality = options?.quality ?? "high";

	scene.loadingTexturesQuality = options?.texturesQuality ?? scene.loadingQuality;
	scene.loadingShadowsQuality = options?.shadowsQuality ?? scene.loadingQuality;
	scene.loadingLodsQuality = options?.lodsQuality ?? scene.loadingQuality;

	const sceneData = getSceneData(scene);

	if (options?.physicsWorld !== undefined) {
		sceneData.physicsWorld = options.physicsWorld;
	}

	// Offline support (see setupOfflineProvider)
	await _attachOfflineDatabase(scene, `${rootUrl}${sceneFilename}`);

	// Load and parse the scene file. The "loadBabylon" loader of Babylon Lite can't load the scenes of the editor: it only
	// reads the geometries written inline in the file (the editor writes them in ".babylonbinarymeshdata" files), and only
	// creates standard materials and point lights.
	const data = await loadJsonFile<any>(`${rootUrl}${sceneFilename}`, (event) => {
		if (event.total) {
			options?.onProgress?.(Math.min((event.loaded / event.total) * 0.25, 0.25));
		}
	});

	if (data.metadata !== undefined && data.metadata !== null) {
		scene.metadata = data.metadata;
	}

	await parseBabylonScene(scene, rootUrl, data, {
		isMainScene: true,
		brdfUrl: options?.brdfUrl,
		onProgress: (progress) => {
			options?.onProgress?.(0.25 + progress * 0.5);
		},
	});

	if (!options?.skipAssetsPreload) {
		// Loop until all assets are loaded.
		// This is required as some assets can be linked to scripts that are themselves linked to .scene files
		// that are not loaded at the time of the first call to _preloadScriptsAssets.
		let loadedAssetsCount = 0;
		do {
			loadedAssetsCount = await _preloadScriptsAssets(rootUrl, scene, scriptsMap);
		} while (loadedAssetsCount !== 0 && !sceneData.isDisposed);
	}

	options?.onProgress?.(1);

	configureMeshDistanceOrScreenCoverage(scene);
	applyMeshesLODQuality(scene.loadingLodsQuality, scene);

	configureShadowMapRenderListPredicate(scene);
	configureShadowMapRefreshRate(scene);

	if (scene.metadata?.rendering) {
		applyRenderingConfigurations(scene, scene.metadata);

		if (scene.camera) {
			applyRenderingConfigurationForCamera(scene.camera, rootUrl, options?.postProcessConfiguration);
		}
	}

	// The scenes created using "createEditorSceneContext" are rendered through the frame graph tasks of the tools.
	_buildSceneRenderTasks(scene);

	if (scene.metadata?.physicsGravity && sceneData.physicsWorld) {
		const gravity = scene.metadata.physicsGravity;
		setPhysicsGravity(sceneData.physicsWorld, { x: gravity[0], y: gravity[1], z: gravity[2] });
	}

	_applyScriptsForObject(scene, scene, scriptsMap, {
		rootUrl,
	});

	sceneData.transformNodes.slice().forEach((transformNode) => {
		_applyScriptsForObject(scene, transformNode, scriptsMap, {
			rootUrl,
		});
	});

	sceneData.meshes.slice().forEach((mesh) => {
		configurePhysicsAggregate(mesh);
		_applyScriptsForObject(scene, mesh, scriptsMap, {
			rootUrl,
		});
	});

	// The lights include the clustered lights.
	sceneData.lights.slice().forEach((light) => {
		_applyScriptsForObject(scene, light, scriptsMap, {
			rootUrl,
		});
	});

	sceneData.cameras.slice().forEach((camera) => {
		_applyScriptsForObject(scene, camera, scriptsMap, {
			rootUrl,
		});
	});

	sceneData.spriteManagers.slice().forEach((spriteManager) => {
		spriteManager.sprites.forEach((sprite) => {
			_applyScriptsForObject(scene, sprite, scriptsMap, {
				rootUrl,
			});
		});
	});

	configureTransformNodes(scene);

	if (!options?.doNotRegisterScene && !sceneData.isDisposed) {
		await registerLoadedScene(scene);
	}
}
