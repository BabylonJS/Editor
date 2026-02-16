import { Scene } from "@babylonjs/core/scene";
import { SceneLoaderFlags } from "@babylonjs/core/Loading/sceneLoaderFlags";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";

import { isMesh } from "../../../tools/guards";

import { configureTransformNodes } from "../../transform-node";

export async function preloadSceneScriptAsset(key: string, rootUrl: string, scene: Scene) {
	const filename = key.split("/").pop()!;
	const sceneFilename = filename.replace(".scene", ".babylon");

	// Load asset container
	const container = await LoadAssetContainerAsync(sceneFilename, scene, {
		rootUrl: rootUrl,
		pluginExtension: ".babylon",
	});

	// Ensure all meshes perform their delay state check
	if (SceneLoaderFlags.ForceFullSceneLoadingForIncremental) {
		scene.meshes.forEach((m) => isMesh(m) && m._checkDelayState());
	}

	container.addAllToScene();

	configureTransformNodes(scene);

	return container;
}
