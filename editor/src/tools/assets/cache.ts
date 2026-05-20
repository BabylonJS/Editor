import { cpus } from "os";
import { join } from "path/posix";
import { remove, writeJSON } from "fs-extra";

import { getProjectAssetsRootUrl } from "../../project/configuration";

import { normalizedGlob } from "../fs";
import { executeSimpleWorker } from "../worker";
import { splitArrayIntoChunks } from "../tools";

export interface IAssetCache {
	/**
	 * Defines the new relative path (related to the absolute paht of the project) of the asset.
	 */
	newRelativePath: string;
}

/**
 * Cache of assets to update their references in materials, scenes, etc. in case they are moved or renamed.
 */
export const assetsCache: Record<string, IAssetCache> = {};

/**
 * Loads the previously saved assets cache from the .assets-cache.json file.
 */
export function loadSavedAssetsCache() {
	const rootUrl = getProjectAssetsRootUrl();

	try {
		if (rootUrl) {
			const keys = Object.keys(assetsCache);
			if (!keys.length) {
				const savedAssetsCache = require(join(rootUrl, "assets", ".assets-cache.json"));
				Object.assign(assetsCache, savedAssetsCache);
			}
		}
	} catch (e) {
		// Catch silently. Maybe the cache doesn't exist.
	}

	return assetsCache;
}

/**
 * Saves the assets cache to the .assets-cache.json file in the "assets" folder of the project.
 * This is useful to save that file in case the user never saved the project after moving/renaming assets.
 * In case the current assets cache has no entry, the .assets-cache.json file is removed.
 */
export async function saveAssetsCache() {
	const rootUrl = getProjectAssetsRootUrl();
	if (!rootUrl) {
		return;
	}

	const keys = Object.keys(assetsCache);
	const filename = join(rootUrl, "assets", ".assets-cache.json");

	if (keys.length) {
		await writeJSON(filename, assetsCache, {
			encoding: "utf-8",
			spaces: "\t",
		});
	} else {
		try {
			await remove(filename);
		} catch (e) {
			// Catch silently.
		}
	}
}

/**
 * When the user saves the project, this function updates ALL the references to the assets that still use the old paths.
 * After applying the cache, the cache is cleared and the .assets-cache.json file is removed.
 */
export async function applyAssetsCache() {
	const rootUrl = getProjectAssetsRootUrl();
	if (!rootUrl) {
		return;
	}

	const entries = Object.entries(assetsCache);

	if (entries.length > 0) {
		await applyDirectoryAssetsCache(join(rootUrl, "assets"), entries);
		await applyDirectoryAssetsCache(join(rootUrl, "public/scene"), entries);

		for (const [originalRelativePath, _] of entries) {
			delete assetsCache[originalRelativePath];
		}
	}

	await saveAssetsCache();
}

/**
 * Applies the update of all assets in the given directory that still reference old paths.
 * It'll basically look for all .material, .scene, .npss, .babylon files etc.
 * @param directory defines the directory to search for assets.
 * @param entries defines the assets cache entries.
 */
export async function applyDirectoryAssetsCache(directory: string, entries: [string, IAssetCache][]) {
	const materialFiles = (await normalizedGlob(join(directory, "/**/*.material"), {
		nodir: true,
	})) as string[];

	const nodeParticleSystemSetFiles = (await normalizedGlob(join(directory, "/**/*.npss"), {
		nodir: true,
	})) as string[];

	const babylonFiles = (await normalizedGlob(join(directory, "/**/*.babylon"), {
		nodir: true,
	})) as string[];

	const allFiles = [...materialFiles, ...nodeParticleSystemSetFiles, ...babylonFiles];

	const sceneFolders = (await normalizedGlob(join(directory, "/**/*.scene"), {
		nodir: false,
	})) as string[];

	await Promise.all(
		sceneFolders.map(async (sceneFolder) => {
			const sceneJsonFiles = (await normalizedGlob(join(sceneFolder, "/**/*.json"), {
				nodir: true,
			})) as string[];

			allFiles.push(...sceneJsonFiles);
		})
	);

	const cpusCount = cpus().length;
	const chunksSize = Math.ceil(allFiles.length / cpusCount);
	const chunks = splitArrayIntoChunks(allFiles, chunksSize);

	await Promise.all(
		chunks.map(async (chunk) => {
			return executeSimpleWorker("workers/files-replace.js", {
				entries,
				allFiles: chunk,
			});
		})
	);
}
