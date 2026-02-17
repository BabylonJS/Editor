import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Constants } from "@babylonjs/core/Engines/constants";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";

import { isMesh } from "../tools/guards";
import { configureShadowMapRefreshRate, configureShadowMapRenderListPredicate } from "../tools/light";

import { IScript } from "../script";

import { applyRenderingConfigurationForCamera } from "../rendering/tools";

import { configurePhysicsAggregate } from "./physics";
import { applyRenderingConfigurations } from "./rendering";

import { _applyScriptsForObject } from "./script/apply";
import { _preloadScriptsAssets } from "./script/preload";

import { registerAudioParser } from "./sound";
import { registerTextureParser } from "./texture";
import { registerShadowGeneratorParser } from "./shadows";
import { registerMorphTargetManagerParser } from "./morph-target-manager";

import { registerSpriteMapParser } from "./sprite-map";
import { registerSpriteManagerParser } from "./sprite-manager";
import { registerNodeParticleSystemSetParser } from "./node-particle-system-set";
import { configureTransformNodes } from "./transform-node";

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
};

declare module "@babylonjs/core/scene" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Scene {
		loadingQuality: SceneLoaderQualitySelector;
		loadingTexturesQuality: SceneLoaderQualitySelector;
		loadingShadowsQuality: SceneLoaderQualitySelector;
	}
}

export async function loadScene(rootUrl: any, sceneFilename: string, scene: Scene, scriptsMap: ScriptMap, options?: SceneLoaderOptions) {
	scene.loadingQuality = options?.quality ?? "high";

	scene.loadingTexturesQuality = options?.texturesQuality ?? scene.loadingQuality;
	scene.loadingShadowsQuality = options?.shadowsQuality ?? scene.loadingQuality;

	registerAudioParser();
	registerTextureParser();
	registerShadowGeneratorParser();

	registerMorphTargetManagerParser();

	registerSpriteMapParser();
	registerSpriteManagerParser();

	registerNodeParticleSystemSetParser();

	await AppendSceneAsync(`${rootUrl}${sceneFilename}`, scene, {
		pluginExtension: ".babylon",
		onProgress: (event) => {
			const progress = Math.min((event.loaded / event.total) * 0.5);
			options?.onProgress?.(progress);
		},
	});

	if (!options?.skipAssetsPreload) {
		// Do it once for all existing assets.
		await _preloadScriptsAssets(rootUrl, scene, scriptsMap);
		// Do it again to ensure assets linked to .scene are loaded too. TODO: fix THAT
		await _preloadScriptsAssets(rootUrl, scene, scriptsMap);
	}

	// Ensure all meshes perform their delay state check
	if (SceneLoaderFlags.ForceFullSceneLoadingForIncremental) {
		scene.meshes.forEach((m) => isMesh(m) && m._checkDelayState());
	}

	const waitingItemsCount = scene.getWaitingItemsCount();

	// Wait until scene is ready.
	while (!scene.isDisposed && (!scene.isReady() || scene.getWaitingItemsCount() > 0)) {
		await new Promise<void>((resolve) => setTimeout(resolve, 150));

		const loadedItemsCount = waitingItemsCount - scene.getWaitingItemsCount();

		if (loadedItemsCount === waitingItemsCount) {
			scene.textures.forEach((texture) => {
				if (texture.delayLoadState === Constants.DELAYLOADSTATE_NONE) {
					texture.delayLoadState = Constants.DELAYLOADSTATE_LOADED;
				}
			});
		}

		options?.onProgress?.(0.5 + (loadedItemsCount / waitingItemsCount) * 0.5);
	}

	options?.onProgress?.(1);

	configureShadowMapRenderListPredicate(scene);
	configureShadowMapRefreshRate(scene);

	if (scene.metadata?.rendering) {
		applyRenderingConfigurations(scene, scene.metadata.rendering);

		if (scene.activeCamera) {
			applyRenderingConfigurationForCamera(scene.activeCamera, rootUrl);
		}
	}

	if (scene.metadata?.physicsGravity) {
		scene.getPhysicsEngine()?.setGravity(Vector3.FromArray(scene.metadata?.physicsGravity));
	}

	_applyScriptsForObject(scene, scene, scriptsMap, rootUrl);

	scene.transformNodes.forEach((transformNode) => {
		_applyScriptsForObject(scene, transformNode, scriptsMap, rootUrl);
	});

	scene.meshes.forEach((mesh) => {
		configurePhysicsAggregate(mesh);
		_applyScriptsForObject(scene, mesh, scriptsMap, rootUrl);
	});

	scene.lights.forEach((light) => {
		_applyScriptsForObject(scene, light, scriptsMap, rootUrl);
	});

	scene.cameras.forEach((camera) => {
		_applyScriptsForObject(scene, camera, scriptsMap, rootUrl);
	});

	scene.spriteManagers?.forEach((spriteManager) => {
		spriteManager.sprites.forEach((sprite) => {
			_applyScriptsForObject(scene, sprite, scriptsMap, rootUrl);
		});
	});

	configureTransformNodes(scene);
}
