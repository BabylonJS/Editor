import { Scene } from "@babylonjs/core/scene";

import { ScriptMap } from "../loader";
import { AdvancedAssetContainer } from "../container";

import { preloadSceneScriptAsset } from "./preload/scene";
import { preloadCommonScriptAsset } from "./preload/common";
import { preloadNavMeshScriptAsset } from "./preload/navmesh";

/**
 * Defines the cache of all
 */
export const scriptAssetsCache = new Map<string, any>();

/**
 * @internal
 */
export async function _preloadScriptsAssets(rootUrl: string, scene: Scene, scriptsMap: ScriptMap) {
	const nodes = [scene, ...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];

	const scripts = nodes
		.filter((node) => node.metadata?.scripts?.length)
		.map((node) => node.metadata.scripts)
		.flat();

	scripts.forEach((script) => {
		if (!script.values) {
			return;
		}

		for (const key in script.values) {
			if (!script.values.hasOwnProperty(key)) {
				continue;
			}

			const obj = script.values[key];
			if (obj.type === "asset" && obj.value) {
				scriptAssetsCache.set(obj.value, null);
			}
		}
	});

	const promises: Promise<void>[] = [];

	scriptAssetsCache.forEach((_, key) => {
		if (scriptAssetsCache.get(key)) {
			return;
		}

		promises.push(
			new Promise<void>(async (resolve) => {
				try {
					const extension = key.split(".").pop();
					switch (extension) {
						case "scene":
							scriptAssetsCache.set(key, new AdvancedAssetContainer(await preloadSceneScriptAsset(key, rootUrl, scene), rootUrl, scriptsMap));
							break;

						case "navmesh":
							scriptAssetsCache.set(key, await preloadNavMeshScriptAsset(key, rootUrl));
							break;

						default:
							scriptAssetsCache.set(key, await preloadCommonScriptAsset(key, rootUrl));
							break;
					}
				} catch (e) {
					console.error(e);
				}

				resolve();
			})
		);
	});

	await Promise.all(promises);
}
