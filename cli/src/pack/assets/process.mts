import { basename, extname, join } from "node:path/posix";

import fs from "fs-extra";

import { ICreateAssetsParams } from "./assets.mjs";
import { processExportedTexture } from "./texture.mjs";

const supportedImagesExtensions: string[] = [".jpg", ".jpeg", ".webp", ".png", ".bmp"];
const supportedCubeTexturesExtensions: string[] = [".env", ".dds"];
const supportedAudioExtensions: string[] = [".mp3", ".wav", ".wave", ".ogg"];
const supportedJsonExtensions: string[] = [".material", ".gui", ".cinematic", ".npss", ".json"];
const supportedMiscExtensions: string[] = [".3dl", ".exr", ".hdr"];

const supportedExtensions: string[] = [
	...supportedImagesExtensions,
	...supportedCubeTexturesExtensions,
	...supportedAudioExtensions,
	...supportedJsonExtensions,
	...supportedMiscExtensions,
];

export interface IProcessAssetFileOptions extends ICreateAssetsParams {
	outputAssetsDir: string;
	exportedAssets: string[];
	cache: Record<string, string>;
}

export async function processAssetFile(file: string, options: IProcessAssetFileOptions) {
	const isNavMesh = file.includes(".navmesh");
	const extension = extname(file).toLocaleLowerCase();

	if (!isNavMesh && !supportedExtensions.includes(extension)) {
		return;
	}

	if (basename(file).startsWith("editor_preview")) {
		return;
	}

	const relativePath = file.replace(join(options.projectDir, "/"), "");
	const split = relativePath.split("/");

	let path = "";
	for (let i = 0; i < split.length - 1; ++i) {
		try {
			await fs.ensureDir(join(options.publicDir, path, split[i]));
		} catch (e) {
			// Catch silently.
		}

		path = join(path, split[i]);
	}

	let isNewFile = false;

	const fileStat = await fs.stat(file);
	const hash = fileStat.mtimeMs.toString();

	isNewFile = !options.cache[relativePath] || options.cache[relativePath] !== hash;

	options.cache[relativePath] = hash;

	const finalPath = join(options.publicDir, relativePath);
	const finalPathExists = await fs.pathExists(finalPath);

	if (isNewFile || !finalPathExists) {
		await fs.copyFile(file, finalPath);
	}

	options.exportedAssets.push(finalPath);

	if (supportedImagesExtensions.includes(extension)) {
		await processExportedTexture(finalPath, {
			force: isNewFile,
			exportedAssets: options.exportedAssets,
		});
	}
}
