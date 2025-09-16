import { join } from "path/posix";
import { readFile, remove, writeFile, writeJSON } from "fs-extra";

import { getProjectAssetsRootUrl } from "../../project/configuration";

import { normalizedGlob } from "../fs";

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
		await applyDirectoryAssetsCache(join(rootUrl, "public/scene/assets"), entries);

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
 * @param entires defines the assets cache entries.
 */
export async function applyDirectoryAssetsCache(directory: string, entires: [string, IAssetCache][]) {
	const materialFiles = await normalizedGlob(join(directory, "/**/*.material"), {
		nodir: true,
	});

	const nodeParticleSystemSetFiles = await normalizedGlob(join(directory, "/**/*.npss"), {
		nodir: true,
	});

	const babylonFiles = await normalizedGlob(join(directory, "/**/*.babylon"), {
		nodir: true,
	});

	const allFiles = [...materialFiles, ...nodeParticleSystemSetFiles, ...babylonFiles];

	const sceneFolders = await normalizedGlob(join(directory, "/**/*.scene"), {
		nodir: false,
	});

	await Promise.all(
		sceneFolders.map(async (sceneFolder) => {
			const sceneJsonFiles = await normalizedGlob(join(sceneFolder, "/**/*.json"), {
				nodir: true,
			});

			allFiles.push(...sceneJsonFiles);
		})
	);

	await Promise.all(
		allFiles.map(async (file: string) => {
			try {
				let data = await readFile(file, "utf-8");

				for (const [originalRelativePath, cache] of entires) {
					const regex = new RegExp(originalRelativePath, "g");
					data = data.replace(regex, cache.newRelativePath);
				}

				await writeFile(file, data, "utf-8");
			} catch (e) {
				// Catch silently.
			}
		})
	);
}
