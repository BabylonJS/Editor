import { join, basename, extname } from "path/posix";
import { copyFile, pathExists, stat } from "fs-extra";

import { createDirectoryIfNotExist } from "../../tools/fs";

import { Editor } from "../../editor/main";

import { compressFileToKtx } from "./ktx";
import { processExportedTexture } from "./texture";

const supportedImagesExtensions: string[] = [
	".jpg", ".jpeg",
	".png",
	".bmp",
];

const supportedCubeTexturesExtensions: string[] = [
	".env", ".dds",
];

const supportedAudioExtensions: string[] = [
	".mp3", ".wav", ".wave", ".ogg",
];

const supportedJsonExtensions: string[] = [
	".gui", ".cinematic",
];

const supportedExtensions: string[] = [
	...supportedImagesExtensions,
	...supportedCubeTexturesExtensions,
	...supportedAudioExtensions,
	...supportedJsonExtensions,
];

export type ProcessFileOptions = {
    optimize: boolean;
    scenePath: string;
    projectDir: string;
    exportedAssets: string[];
    cache: Record<string, string>;
};

export async function processAssetFile(editor: Editor, file: string, options: ProcessFileOptions): Promise<void> {
	const extension = extname(file).toLocaleLowerCase();
	if (!supportedExtensions.includes(extension)) {
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
			await createDirectoryIfNotExist(join(options.scenePath, path, split[i]));
		} catch (e) {
			// Catch silently.
		}

		path = join(path, split[i]);
	}

	let isNewFile = false;

	if (options.optimize) {
		const fileStat = await stat(file);
		const hash = fileStat.mtimeMs.toString();

		isNewFile = !options.cache[relativePath] || options.cache[relativePath] !== hash;

		options.cache[relativePath] = hash;
	}

	const finalPath = join(options.scenePath, relativePath);
	const finalPathExists = await pathExists(finalPath);

	if (supportedExtensions.includes(extension)) {
		if (isNewFile || !finalPathExists) {
			await copyFile(file, finalPath);
		}

		options.exportedAssets.push(finalPath);
	}

	if (options.optimize) {
		await compressFileToKtx(editor, finalPath, {
			force: isNewFile,
			exportedAssets: options.exportedAssets,
		});
	}

	if (options.optimize && supportedImagesExtensions.includes(extension)) {
		await processExportedTexture(editor, finalPath, {
			force: isNewFile,
			exportedAssets: options.exportedAssets,
		});
	}
}
