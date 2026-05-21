import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

import { loadJsonFile } from "../../tools/request";

import { createAndOpenDatabase } from "./database";

const supportedJsonExtensions = ["babylon", "json"];
const supportedImageExtensions = ["jpg", "jpeg", "png", "bmp", "webp"];
const supportedBinaryExtensions = ["bin", "babylonbinarymeshdata", "mp3", "wav", "ktx", "ktx2"];

const allSupportedExtensions = [...supportedJsonExtensions, ...supportedImageExtensions, ...supportedBinaryExtensions];

type ScenesUsedFilesType = Record<string, string[]>;

export interface IPreloadAssetsToDatabaseOptions {
	engine?: AbstractEngine;
	/**
	 * Defines wether to disable loading and saving images to the database.
	 * This is particularly useful when the application supports compressed KTX textures. So only KTX textures are stored.
	 */
	disableImages?: boolean;
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

	let loadedCount = 0;

	const supportedKtxFormat = options?.engine?.texturesSupported[0];
	const totalLength = Object.values(scenesUsedFiles).reduce((sum, files) => sum + files.length, 0);

	function notifyProgress(resolve?: () => void) {
		++loadedCount;
		options?.onProgress?.(loadedCount / totalLength);
		resolve?.();
	}

	for (const [sceneName, files] of Object.entries(scenesUsedFiles)) {
		const babylonSceneName = sceneName.replace(".scene", ".babylon");

		const database = await createAndOpenDatabase(databaseName, `${rootUrl}${babylonSceneName}`);
		if (!database) {
			continue;
		}

		for (let i = 0, len = files.length; i < len; ++i) {
			const file = files[i];
			const extension = file.split(".").pop()?.toLowerCase();
			if (!extension) {
				notifyProgress();
				continue;
			}

			if (extension === "ktx") {
				if (!supportedKtxFormat) {
					notifyProgress();
					continue;
				} else if (!file.endsWith(supportedKtxFormat)) {
					notifyProgress();
					continue;
				}
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
								}
							} else if (supportedBinaryExtensions.includes(extension)) {
								await database.saveFile(assetUrl, true);
							} else if (supportedJsonExtensions.includes(extension)) {
								await database.saveFile(assetUrl, false);
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
}
