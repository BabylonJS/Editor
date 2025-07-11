import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";

import { isMesh } from "../tools/guards";

import { _applyScriptsForObject } from "./script";
import { configurePhysicsAggregate } from "./physics";
import { applyRenderingConfigurations } from "./rendering";
import { applyRenderingConfigurationForCamera } from "../rendering/tools";
import { configureShadowMapRefreshRate, configureShadowMapRenderListPredicate } from "../tools/light";

import "./sound";
import "./texture";

/**
 * Defines the possible output type of a script.
 * `default` is a class that will be instantiated with the object as parameter.
 * `onStart` is a function that will be called once before the first render passing the reference to the object the script is attached to.
 * `onUpdate` is a function that will be called every frame passing the reference to the object the script is attached to
 */
export type ScriptMap = Record<
	string,
	{
		default?: new (object: any) => {
			onStart?(): void;
			onUpdate?(): void;
		};
		onStart?: (object: any) => void;
		onUpdate?: (object: any) => void;
	}
>;

/**
 * Defines the overall desired quality of the scene.
 * In other words, defines the quality of textures that will be loaded in terms of dimensions.
 * The editor computes automatic "hight (untouched)", "medium (half)", and "low (quarter)" quality levels for textures.
 * Using "medium" or "low" quality levels will reduce the memory usage and improve the performance of the scene
 * especially on mobiles where memory is limited.
 */
export type SceneLoaderQualitySelector = "low" | "medium" | "high";

export type SceneLoaderOptions = {
	quality?: SceneLoaderQualitySelector;
	onProgress?: (value: number) => void;
};

declare module "@babylonjs/core/scene" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Scene {
		loadingQuality: SceneLoaderQualitySelector;
	}
}

export async function loadScene(rootUrl: any, sceneFilename: string, scene: Scene, scriptsMap: ScriptMap, options?: SceneLoaderOptions) {
	scene.loadingQuality = options?.quality ?? "high";

	await AppendSceneAsync(`${rootUrl}${sceneFilename}`, scene, {
		pluginExtension: ".babylon",
		onProgress: (event) => {
			const progress = Math.min((event.loaded / event.total) * 0.5);
			options?.onProgress?.(progress);
		},
	});

	// Ensure all meshes perform their delay state check
	if (SceneLoaderFlags.ForceFullSceneLoadingForIncremental) {
		scene.meshes.forEach((m) => isMesh(m) && m._checkDelayState());
	}

	const waitingItemsCount = scene.getWaitingItemsCount();

	// Wait until scene is ready.
	while (!scene.isReady() || scene.getWaitingItemsCount() > 0) {
		await new Promise<void>((resolve) => setTimeout(resolve, 150));

		const loadedItemsCount = waitingItemsCount - scene.getWaitingItemsCount();

		options?.onProgress?.(
			0.5 + (loadedItemsCount / waitingItemsCount) * 0.5,
		);
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
}
