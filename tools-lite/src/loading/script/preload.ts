import { SceneContext, Texture2D } from "@babylonjs/lite";

import { ISceneDecoratorData } from "../../decorators/apply";

import { getSceneData } from "../../tools/scene";

import { ScriptMap } from "../loader";
import { loadSerializedTexture } from "../texture";
import { AdvancedAssetContainer } from "../container/container";

import { preloadSceneScriptAsset } from "./preload/scene";
import { preloadCommonScriptAsset, preloadMaterialScriptAsset } from "./preload/common";

/**
 * Defines the cache of all preloaded assets for scripts.
 * Used to populate decorated properties in scripts using @visibleAsAsset.
 */
export const scriptAssetsCache = new Map<SceneContext, Map<string, any>>();

/**
 * Defines the cache of all preloaded textures for scripts, by texture name.
 * Used to populate decorated properties in scripts using @visibleAsTexture: the textures of Babylon Lite are loaded
 * asynchronously, they are loaded with the other assets of the scripts before the scripts are created.
 */
export const scriptTexturesCache = new Map<SceneContext, Map<string, Texture2D | null>>();

/**
 * Defines the map of all parsers available to parse script assets.
 * Some assets may not be needed by the game directly such as navmeshes which require the navigation module of Babylon Lite to be included.
 * This map allows to register parsers only when needed to profit from tree shaking.
 */
export const scriptAssetsParsers = new Map<string, (parameters: IScriptAssetParserParameters) => Promise<unknown>>();

/**
 * Defines the assets of the scripts that failed to load, per scene. They are not loaded again: the loading of the
 * assets of the scripts loops until all the assets are loaded (an asset can reference other assets).
 */
const scriptAssetsFailures = new Map<SceneContext, Set<string>>();

export interface IScriptAssetParserParameters {
	key: string;
	rootUrl: string;
	scene: SceneContext;
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
export async function _preloadScriptsAssets(rootUrl: string, scene: SceneContext, scriptsMap: ScriptMap) {
	const sceneData = getSceneData(scene);
	const nodes: any[] = [scene, ...sceneData.transformNodes, ...sceneData.meshes, ...sceneData.lights, ...sceneData.cameras];

	let sceneAssetsCache = scriptAssetsCache.get(scene);
	if (!sceneAssetsCache) {
		sceneAssetsCache = new Map<string, any>();
		scriptAssetsCache.set(scene, sceneAssetsCache);
	}

	let sceneTexturesCache = scriptTexturesCache.get(scene);
	if (!sceneTexturesCache) {
		sceneTexturesCache = new Map<string, Texture2D | null>();
		scriptTexturesCache.set(scene, sceneTexturesCache);
	}

	let failures = scriptAssetsFailures.get(scene);
	if (!failures) {
		failures = new Set<string>();
		scriptAssetsFailures.set(scene, failures);
	}

	sceneData.onDisposeObservable.addOnce(() => {
		scriptAssetsCache.delete(scene);
		scriptTexturesCache.delete(scene);
		scriptAssetsFailures.delete(scene);
	});

	const scriptNodes = nodes
		.filter((node) => node.metadata?.scripts?.length)
		.map((node) => node.metadata.scripts)
		.flat();

	const texturesToLoad: any[] = [];

	scriptNodes.forEach((script) => {
		const ctor = scriptsMap[script.key]?.default as ISceneDecoratorData;
		ctor?._SceneAssets?.forEach((asset) => {
			if (!sceneAssetsCache.get(asset.sceneName)) {
				sceneAssetsCache.set(asset.sceneName, null);
			}
		});

		if (script.values) {
			for (const key in script.values) {
				if (!script.values.hasOwnProperty(key)) {
					continue;
				}

				const obj = script.values[key];
				if (obj.type === "asset" && obj.value && !sceneAssetsCache.get(obj.value)) {
					sceneAssetsCache.set(obj.value, null);
				}

				if (obj.type === "texture" && obj.value) {
					const textureKey = obj.value.name ?? obj.value.url;
					if (textureKey && !sceneTexturesCache.has(textureKey)) {
						sceneTexturesCache.set(textureKey, null);
						texturesToLoad.push(obj.value);
					}
				}
			}
		}
	});

	const texturesPromise = Promise.all(
		texturesToLoad.map(async (textureData) => {
			try {
				sceneTexturesCache.set(textureData.name ?? textureData.url, await loadSerializedTexture(scene, rootUrl, textureData));
			} catch (e) {
				console.error(e);
			}
		})
	);

	let loadedAssetsCount = 0;
	for (const [key, value] of sceneAssetsCache) {
		if (value === null && !failures.has(key)) {
			++loadedAssetsCount;
		}
	}

	if (loadedAssetsCount === 0) {
		await texturesPromise;
		return loadedAssetsCount;
	}

	const promises: Promise<void>[] = [];

	sceneAssetsCache.forEach((_, key) => {
		if (sceneAssetsCache.get(key) || failures!.has(key)) {
			return;
		}

		promises.push(
			new Promise<void>(async (resolve) => {
				try {
					const extension = key.split(".").pop();
					switch (extension) {
						case "scene":
							const entities = await preloadSceneScriptAsset(key, rootUrl, scene);
							// The nodes of the container are released with the scene by Babylon Lite.
							sceneData.onDisposeObservable.addOnce(() => {
								sceneAssetsCache.delete(key);
							});

							sceneAssetsCache.set(key, new AdvancedAssetContainer(scene, entities, rootUrl, scriptsMap));
							break;

						case "material":
							sceneAssetsCache.set(key, await preloadMaterialScriptAsset(key, rootUrl, scene));
							break;

						default:
							if (scriptAssetsParsers.has(extension!)) {
								const parser = scriptAssetsParsers.get(extension!)!;
								sceneAssetsCache.set(key, await parser({ key, rootUrl, scene }));
								break;
							} else {
								sceneAssetsCache.set(key, await preloadCommonScriptAsset(key, rootUrl));
							}
							break;
					}
				} catch (e) {
					failures!.add(key);
					console.error(`Babylon.js Editor Tools Lite: failed to load the asset "${key}" used by the scripts.`, e);
				}

				resolve();
			})
		);
	});

	await Promise.all([...promises, texturesPromise]);

	return loadedAssetsCount;
}
