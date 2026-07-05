import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

import { loadJsonFile } from "../../tools/request";

import { createAndOpenDatabase } from "./database";
import { isUsingKtx2CompressedTextures } from "../../tools/texture";

const supportedSoundExtensions = ["mp3", "wav"];
const supportedGeometryExtensions = ["babylonbinarymeshdata"];
const supportedTextureExtensions = ["ktx", "ktx2", "jpg", "jpeg", "png", "bmp", "webp"];

const supportedJsonExtensions = ["babylon", "json"];
const supportedImageExtensions = ["jpg", "jpeg", "png", "bmp", "webp"];
const supportedBinaryExtensions = ["bin", "ktx", "ktx2", ...supportedGeometryExtensions, ...supportedSoundExtensions];

const allSupportedExtensions = [...supportedJsonExtensions, ...supportedImageExtensions, ...supportedBinaryExtensions];

type ScenesUsedFilesType = Record<string, string[]>;

export interface IPreloadAssetsFilterOptions {
	/**
	 * Defines the name of the scene (ie. "menu.scene") to filter the assets to preload. This is used to match the scene name in the scenes-used-files.json file.
	 */
	sceneName: string;
	/**
	 * Defines wether to disable loading and saving sounds to the database for the preload.
	 */
	disableSounds?: boolean;
	/**
	 * Defines wether to disable loading and saving textures to the database for the preload.
	 */
	disableTextures?: boolean;
	/**
	 * Defines wether to disable loading and saving geometries to the database for the preload (aka. babylonbinarymeshdata files).
	 */
	disableGeometries?: boolean;
}

export interface IPreloadAssetsToDatabaseOptions {
	engine?: AbstractEngine;
	/**
	 * Defines wether to disable loading and saving images to the database.
	 * This is particularly useful when the application supports compressed KTX textures. So only KTX textures are stored.
	 */
	disableImages?: boolean;
	/**
	 * Defines a list of scene names to filter the scenes to preload. If not defined, all scenes will be preloaded.
	 * Using this filter can be useful to reduce the amount of assets to preload when only a subset of scenes is needed.
	 * @example ["menu.babylon", "map1.babylon"]
	 */
	scenesFilter?: (string | IPreloadAssetsFilterOptions)[];
	/**
	 * A callback function that is called with the progress of the asset loading process, as a value between 0 and 1.
	 * @param progress defines the progress of the asset loading process, as a value between 0 and 1.
	 */
	onProgress?: (progress: number) => void;
}

/**
 * Preloads the assets used by the scenes into the database.
 * This can be used to preload the assets before starting the application or to update the database with new assets after a new deployment.
 * This is particularly useful to improve loading times when the application with a slow network connection, as the assets will be loaded from the local database instead of being downloaded from the server each time.
 * @param databaseName defines the name of the database to create (if doesn't exists) and open and save files to it
 * @param rootUrl defines the root url to load the scenes used files list and the scene manifest files from. Typically "/scenes/".
 * @param options defines the options for preloading assets, including a callback function to be called with the progress of the asset loading process
 */
export async function preloadAssetsToDatabase(databaseName: string, rootUrl: string, options?: IPreloadAssetsToDatabaseOptions) {
	const promises: Promise<void>[] = [];
	const scenesUsedFiles = await loadJsonFile<ScenesUsedFilesType>(`${rootUrl}scenes-used-files.json`);

	// Create filters
	let filters: IPreloadAssetsFilterOptions[] = [];

	if (options?.scenesFilter) {
		filters = options.scenesFilter.map((filter) => {
			if (typeof filter === "string") {
				return {
					sceneName: filter,
					disableSounds: false,
					disableTextures: false,
					disableGeometries: false,
				};
			}

			return filter;
		});

		for (const [sceneName, _] of Object.entries(scenesUsedFiles)) {
			if (!filters.find((filter) => filter.sceneName === sceneName)) {
				delete scenesUsedFiles[sceneName];
			}
		}
	}

	let loadedCount = 0;
	let processedFilesCount = 0;

	const supportedKtxFormat = options?.engine?.textureFormatInUse ? options?.engine?.texturesSupported[0] : null;
	const totalLength = Object.values(scenesUsedFiles).reduce((sum, files) => sum + files.length, 0);

	function notifyProgress(resolve?: () => void) {
		++processedFilesCount;
		options?.onProgress?.(processedFilesCount / totalLength);
		resolve?.();
	}

	for (const [sceneName, files] of Object.entries(scenesUsedFiles)) {
		const babylonSceneName = sceneName.replace(".scene", ".babylon");

		const database = await createAndOpenDatabase(databaseName, `${rootUrl}${babylonSceneName}`);
		if (!database) {
			continue;
		}

		const filter = filters.find((filter) => filter.sceneName === sceneName);

		for (let i = 0, len = files.length; i < len; ++i) {
			const file = files[i];
			const extension = file.split(".").pop()?.toLowerCase();
			if (!extension) {
				notifyProgress();
				continue;
			}

			if (supportedGeometryExtensions.includes(extension) && filter?.disableGeometries) {
				notifyProgress();
				continue;
			}

			if (supportedTextureExtensions.includes(extension) && filter?.disableTextures) {
				notifyProgress();
				continue;
			}

			if (supportedSoundExtensions.includes(extension) && filter?.disableSounds) {
				notifyProgress();
				continue;
			}

			if (supportedImageExtensions.includes(extension) && filter?.disableTextures) {
				notifyProgress();
				continue;
			}

			// For KTX textures, check that format is supported else ignore the file.
			if (extension === "ktx") {
				if (!supportedKtxFormat) {
					notifyProgress();
					continue;
				} else if (!file.endsWith(supportedKtxFormat)) {
					notifyProgress();
					continue;
				}
			}

			// For KTX2 textures, just check that the engine is configured to use those KTX2 textures, else ignore the file.
			if (extension === "ktx2" && !isUsingKtx2CompressedTextures()) {
				notifyProgress();
				continue;
			}

			if (promises.length > 300) {
				try {
					await Promise.all(promises);
				} catch (e) {
					// Catch silently.
				}

				promises.splice(0, promises.length);
			}

			const assetUrl = `${rootUrl}${file}`;

			if (allSupportedExtensions.includes(extension)) {
				promises.push(
					new Promise<void>(async (resolve) => {
						if (await database.isFileMatchingVersion(assetUrl)) {
							return notifyProgress(resolve);
						}

						try {
							if (supportedImageExtensions.includes(extension)) {
								if (!options?.disableImages) {
									await database.saveImage(assetUrl);
									++loadedCount;
								}
							} else if (supportedBinaryExtensions.includes(extension)) {
								await database.saveFile(assetUrl, true);
								++loadedCount;
							} else if (supportedJsonExtensions.includes(extension)) {
								await database.saveFile(assetUrl, false);
								++loadedCount;
							}
						} catch (e) {
							// Catch silently.
						}

						notifyProgress(resolve);
					})
				);
			}
		}

		await Promise.all(promises);
		database.close();
	}

	await Promise.all(promises);

	return {
		loadedCount,
		processedFilesCount,
	};
}
