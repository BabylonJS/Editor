import { basename, extname, join } from "node:path/posix";

import fs from "fs-extra";

import { compressFileToKtx } from "./ktx.mjs";
import { compressFileToKtx2 } from "./ktx2.mjs";
import { ICreateAssetsOptions } from "./assets.mjs";
import { processExportedMaterial } from "./material.mjs";
import { processExportedNodeParticleSystemSet } from "./particle-system.mjs";
import { EditorProjectCompressedTextureSoftware, processExportedTexture } from "./texture.mjs";

export const supportedImagesExtensions: string[] = [".jpg", ".jpeg", ".webp", ".png", ".bmp"];
export const supportedCubeTexturesExtensions: string[] = [".env", ".dds", ".hdr"];
export const supportedAudioExtensions: string[] = [".mp3", ".wav", ".wave", ".ogg"];
export const supportedJsonExtensions: string[] = [".material", ".gui", ".cinematic", ".npss", ".ragdoll", ".json"];
export const supportedMiscExtensions: string[] = [".3dl", ".exr", ".hdr"];

export const supportedExtensions: string[] = [
	...supportedImagesExtensions,
	...supportedCubeTexturesExtensions,
	...supportedAudioExtensions,
	...supportedJsonExtensions,
	...supportedMiscExtensions,
];

export interface IProcessAssetFileOptions extends ICreateAssetsOptions {
	outputAssetsDir: string;
	exportedAssets: string[];
	optimize: boolean;
	cache: Record<string, string>;

	compressedTexturesEnabled: boolean;
	compressedEtc2Enabled?: boolean;
	compressedPvrtcEnabled?: boolean;
	compressedTextureQuality?: string;
	compressedTextureSoftware?: EditorProjectCompressedTextureSoftware;
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
		if (supportedJsonExtensions.includes(extension)) {
			await fs.writeJSON(finalPath, await fs.readJSON(file), {
				encoding: "utf-8",
			});
		} else {
			await fs.copyFile(file, finalPath);
		}
	}

	options.onStepChanged?.("assets", {
		message: `Processed asset: ${relativePath}`,
	});

	options.exportedAssets.push(finalPath);

	if (options.optimize) {
		if (options.compressedTextureSoftware === "PVRTexTool") {
			await compressFileToKtx(finalPath, { force: isNewFile, ...options });
		} else if (options.compressedTextureSoftware === "Khronos KTX-Software") {
			await compressFileToKtx2(finalPath, { force: isNewFile, ...options });
		}
	}

	if (options.optimize) {
		if (supportedImagesExtensions.includes(extension)) {
			await processExportedTexture(finalPath, {
				...options,
				force: isNewFile,
			});
		} else if (extension === ".material") {
			await processExportedMaterial(finalPath, {
				...options,
				force: isNewFile,
			});
		} else if (extension === ".npss") {
			await processExportedNodeParticleSystemSet(finalPath, {
				...options,
				force: isNewFile,
			});
		}
	}
}
