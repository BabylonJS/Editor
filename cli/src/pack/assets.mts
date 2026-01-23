import { basename, extname, join } from "node:path/posix";

import fs from "fs-extra";

import { normalizedGlob } from "../tools/fs.mjs";

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

export interface ICreateAssetsParams {
	projectDir: string;
	publicDir: string;
}

export async function createAssets(options: ICreateAssetsParams) {
	const baseAssetsDir = join(options.projectDir, "assets");
	const outputAssetsDir = join(options.publicDir, "assets");

	await fs.ensureDir(outputAssetsDir);

	const files = await normalizedGlob(join(baseAssetsDir, "**/*"), {
		nodir: true,
		ignore: {
			childrenIgnored: (p) => extname(p.name) === ".scene",
		},
	});

	const promises: Promise<void>[] = [];
	const exportedAssets: string[] = [];

	for (const file of files) {
		if (promises.length >= 5) {
			await Promise.all(promises);
			promises.length = 0;
		}

		promises.push(
			processAssetFile(file, {
				...options,
				outputAssetsDir,
				exportedAssets,
			})
		);
	}

	await Promise.all(promises);

	// Clean
	const publicFiles = await normalizedGlob(join(outputAssetsDir, "**/*"), {
		nodir: true,
	});

	publicFiles.forEach((file) => {
		if (!exportedAssets.includes(file.toString())) {
			fs.remove(file);
		}
	});
}

export interface IProcessAssetFileOptions extends ICreateAssetsParams {
	outputAssetsDir: string;
	exportedAssets: string[];
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

	const finalPath = join(options.publicDir, relativePath);

	await fs.copyFile(file, finalPath);

	options.exportedAssets.push(finalPath);
}
