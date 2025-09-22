import { dirname, join } from "path/posix";
import { pathExists, readJSON, stat, writeJSON } from "fs-extra";

import { Tools } from "babylonjs";

import { Editor } from "../../editor/main";

import { temporaryDirectoryName } from "../project";
import { getProjectAssetsRootUrl, projectConfiguration } from "../../project/configuration";

import { waitUntil } from "../tools";
import { executeSimpleWorker, loadWorker } from "../worker";

let previewCount = 0;
let requestedPreviewCount = 0;

export interface IThumbnailCache {
	thumbnail: string;
	lastModified: string;
}

/**
 * Defines the dictionary of thumbnail image encoded as base64 for the assets such as materials and meshes.
 */
export const thumbnailCache: Record<string, IThumbnailCache> = {};

export type ThumbnailType = "mesh" | "material";

export interface IComputeThumbnailOptions {
	/**
	 * Defines the type of thumbnail to compute.
	 */
	type: ThumbnailType;
	/**
	 * Defines the absolute path to the asset to compute its thumbnail (.material, .glb, etc.).
	 */
	absolutePath: string;
}

/**
 * Computes and returns the thumbnail associated to the asset located at the given absolute path in the options object.
 * All thumbnails are stored in a cache to avoid computing twice. If the thumbnail already exist in the cache it's returned immediately.
 * Else, the thumbnail is computed and then added to the cache store.
 * @param editor defines the reference to the editor.
 * @param options defines the options of the thumbnail that sould be computed.
 */
export async function computeOrGetThumbnail(editor: Editor, options: IComputeThumbnailOptions) {
	const rootUrl = getProjectAssetsRootUrl();
	if (!rootUrl) {
		return null;
	}

	const cacheKey = options.absolutePath.replace(rootUrl, "");

	const fileStat = await stat(options.absolutePath);
	const lastModified = fileStat.mtimeMs.toString();

	if (thumbnailCache[cacheKey]?.lastModified === lastModified) {
		return thumbnailCache[cacheKey].thumbnail;
	}

	++requestedPreviewCount;

	if (previewCount > 0) {
		await waitUntil(() => previewCount === 0);
	}

	++previewCount;

	const thumbnail = await getAssetThumbnailBase64(options.absolutePath, {
		rootUrl,
		type: options.type,
		serializedEnvironmentTexture: editor.layout.preview.scene.environmentTexture?.serialize(),
	});

	--requestedPreviewCount;

	if (thumbnail) {
		thumbnailCache[cacheKey] = {
			thumbnail,
			lastModified,
		};
	}

	// Save cache?
	if (requestedPreviewCount === 0) {
		try {
			await saveAssetsThumbnailCache();
		} catch (e) {
			editor.layout.console.error("Failed to save assets thumbnail cache");
			editor.layout.console.error(e.message?.toString());
		}
	}

	--previewCount;

	return thumbnail;
}

let worker: Worker | null = null;

/**
 * Creates or gets the current worker used to compute thumbnails.
 * Worker is null by default and can be terminated in case the asset takes too much time to compute its thumbnail.
 */
export function createOrGetThumbnailWorker() {
	if (!worker) {
		worker = loadWorker("workers/thumbnail/main.js");
	}

	return worker;
}

/**
 * Terminates the current thumbnail worker if any.
 */
export function terminateWorker() {
	worker?.terminate();
	worker = null;
}

export interface IThumbnailOptions {
	/**
	 * Defines the type of asset to create thumbnail.
	 */
	type: ThumbnailType;
	/**
	 * The root URL for the assets.
	 */
	rootUrl: string;
	/**
	 * The serialized environment texture for the thumbnail to help rendering materials such as PBR.
	 */
	serializedEnvironmentTexture?: any;
}

/**
 * Creates a new thumbnail for the asset located at the given absolute path.
 * @param absolutePath defines the absolute path to the asset file
 * @param options defines the options for the thumbnail generation
 * @returns the base64 encoded thumbnail image
 */
export async function getAssetThumbnailBase64(absolutePath: string, options: IThumbnailOptions) {
	const result = await new Promise<{ preview: string }>(async (resolve) => {
		const timeoutId = setTimeout(() => {
			terminateWorker();
			resolve({ preview: "" });
		}, 10_000);

		const r = await executeSimpleWorker<{ preview: string }>(createOrGetThumbnailWorker(), {
			absolutePath,
			...options,
			id: Tools.RandomId(),
		});

		clearTimeout(timeoutId);

		if (r) {
			resolve(r);
		}
	});

	return result.preview;
}

/**
 * Saves the state of the current thumbnail cache to .bjseditor temporary directory located in the root of the project's folder.
 */
export async function saveAssetsThumbnailCache() {
	if (!projectConfiguration.path) {
		return;
	}

	const projectDirectory = dirname(projectConfiguration.path);
	const cacheAbsolutePath = join(projectDirectory, temporaryDirectoryName, ".assets-thumbnail-cache.json");

	const keys = Object.keys(thumbnailCache);
	const projectRootUrl = getProjectAssetsRootUrl()!;

	await Promise.all(
		keys.map(async (key) => {
			const absolutePath = join(projectRootUrl, key);
			if (!(await pathExists(absolutePath))) {
				delete thumbnailCache[key];
			}
		})
	);

	await writeJSON(cacheAbsolutePath, thumbnailCache, {
		encoding: "utf-8",
		spaces: "\t",
	});
}

/**
 * To avoid recomputing thumbnails each time a project is loaded, the cache is saved on disk for the
 * project's temporary directory (.bjseditor folder located at the root of the project).
 * This function loads the saved thumbnails cache from disk.
 */
export async function loadSavedThumbnailsCache() {
	const rootUrl = getProjectAssetsRootUrl();
	if (!rootUrl) {
		return;
	}

	try {
		const savedCache = await readJSON(join(rootUrl, ".bjseditor", ".assets-thumbnail-cache.json"));
		Object.assign(thumbnailCache, savedCache);
	} catch (e) {
		// Catch silently.
	}
}
