import { SceneContext } from "@babylonjs/lite";

import { loadJsonFile } from "../../../tools/request";

import { configureTransformNodes } from "../../transform-node";
import { IParsedSceneEntities, parseBabylonScene } from "../../scene-parser";

export async function preloadSceneScriptAsset(key: string, rootUrl: string, scene: SceneContext): Promise<IParsedSceneEntities> {
	const filename = key.split("/").pop()!;
	const sceneFilename = filename.replace(".scene", ".babylon");

	const data = await loadJsonFile<any>(`${rootUrl}${sceneFilename}`);

	const entities = await parseBabylonScene(scene, rootUrl, data, {
		isMainScene: false,
	});

	configureTransformNodes(scene);

	return entities;
}
