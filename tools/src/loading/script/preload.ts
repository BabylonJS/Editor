import { Scene } from "@babylonjs/core/scene";

import { ScriptMap } from "../loader";
import { AdvancedAssetContainer } from "../container";

import { preloadSceneScriptAsset } from "./preload/scene";
import { preloadCommonScriptAsset } from "./preload/common";

/**
 * Defines the cache of all preloaded assets for scripts.
 * Used to populate decorated properties in scripts using @visibleAsAsset.
 */
export const scriptAssetsCache = new Map<string, any>();

/**
 * Defines the map of all parsers available to parse script assets.
 * Some assets may not be needed by the game directly such as navmeshes which require @recast-navigation packages to be included.
 * This map allows to register parsers only when needed to profit from tree shaking.
 */
export const scriptAssetsParsers = new Map<string, (parameters: IScriptAssetParserParameters) => Promise<unknown>>();

export interface IScriptAssetParserParameters {
	key: string;
	rootUrl: string;
	scene: Scene;
}

/**
 *
 * @param extension defines the extension supported by the parser. ie: "navmesh"
 * @param parser defines the parser function to parse the asset.
 */
export function registerScriptAssetParser(extension: string, parser: (parameters: IScriptAssetParserParameters) => Promise<unknown>) {
	if (scriptAssetsParsers.has(extension)) {
		console.warn(`A parser for the extension '${extension}' was already registered. It will be overwritten.`);
	}

	scriptAssetsParsers.set(extension, parser);
}

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

						default:
							if (scriptAssetsParsers.has(extension!)) {
								const parser = scriptAssetsParsers.get(extension!)!;
								scriptAssetsCache.set(key, await parser({ key, rootUrl, scene }));
								break;
							} else {
								scriptAssetsCache.set(key, await preloadCommonScriptAsset(key, rootUrl));
							}
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
