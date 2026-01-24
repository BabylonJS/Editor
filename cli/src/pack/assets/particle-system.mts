import { join } from "node:path/posix";

import fs from "fs-extra";

import { extractTextureAssetFromDataString, extractTextureAssetFromUrl } from "../../tools/extract.mjs";

import { getExtractedTextureOutputPath } from "./texture.mjs";

export interface IProcessExportedMaterialOptions {
	force: boolean;
	publicDir: string;
	exportedAssets: string[];
}

export async function processExportedParticleSystem(absolutePath: string, options: IProcessExportedMaterialOptions) {
	const particleSystemData = await fs.readJSON(absolutePath);
	if (particleSystemData.customType !== "BABYLON.NodeParticleSystemSet") {
		return;
	}

	const extractedTexturesOutputPath = getExtractedTextureOutputPath(options.publicDir);
	await fs.ensureDir(extractedTexturesOutputPath);

	const relativePaths = await extractNodeParticleSystemSetTextures(particleSystemData, {
		extractedTexturesOutputPath,
	});

	await fs.writeJSON(absolutePath, particleSystemData, {
		encoding: "utf-8",
	});

	await Promise.all(
		relativePaths.map(async (relativePath) => {
			const finalPath = join(options.publicDir, relativePath);

			options.exportedAssets.push(finalPath);

			// await compressFileToKtx(editor, finalPath, {
			// 	force: options.force,
			// 	exportedAssets: options.exportedAssets,
			// });
		})
	);
}

export interface IExtractParticleSystemTexturesOptions {
	extractedTexturesOutputPath: string;
}

export async function extractParticleSystemTextures(particleSystemData: any, options: IExtractParticleSystemTexturesOptions) {
	let relativePath: string | null = null;

	if (particleSystemData.texture?.name.startsWith("http://") || particleSystemData.texture?.name.startsWith("https://")) {
		relativePath = await extractTextureAssetFromUrl(particleSystemData.texture.name, {
			...options,
		});
	} else if (particleSystemData.texture?.name.startsWith("data:")) {
		relativePath = await extractTextureAssetFromDataString(particleSystemData.texture.name, {
			...options,
		});
	}

	if (relativePath) {
		particleSystemData.texture.name = relativePath;
		particleSystemData.texture.url = particleSystemData.texture.name;
	}
}

export async function extractNodeParticleSystemSetTextures(particleSystemData: any, options: IExtractParticleSystemTexturesOptions) {
	const blocks = particleSystemData.blocks.filter((block) => block.customType === "BABYLON.ParticleTextureSourceBlock");

	const relativePaths: string[] = [];

	await Promise.all(
		blocks.map(async (block: any) => {
			if (block.url?.startsWith("http://") || block.url.startsWith("https://")) {
				const relativePath = await extractTextureAssetFromUrl(block.url, {
					...options,
				});

				if (relativePath) {
					relativePaths.push(relativePath);
					block.url = relativePath;
				}
			}

			if (block.textureDataUrl?.startsWith("data:")) {
				const relativePath = await extractTextureAssetFromDataString(block.textureDataUrl, {
					...options,
				});

				if (relativePath) {
					relativePaths.push(relativePath);
					delete block.textureDataUrl;
					block.url = relativePath;
				}
			}
		})
	);

	return relativePaths;
}
