import { SceneContext } from "@babylonjs/lite";

import { loadJsonFile } from "../../../tools/request";

import { loadMaterialFromFile } from "../../material";

export async function preloadCommonScriptAsset(key: string, rootUrl: string) {
	return loadJsonFile<any>(`${rootUrl}${key}`);
}

/**
 * Loads the material asset (`.material` file) located at the given key. The material is created once and shared by
 * all the scripts referencing it: the materials of Babylon Lite are created asynchronously.
 * @param key defines the path of the material asset relative to the root url.
 * @param rootUrl defines the root url of the scene.
 * @param scene defines the reference to the scene where the material is used.
 */
export async function preloadMaterialScriptAsset(key: string, rootUrl: string, scene: SceneContext) {
	return loadMaterialFromFile(rootUrl, key, scene);
}
