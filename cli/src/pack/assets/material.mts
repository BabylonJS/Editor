import { join } from "node:path/posix";

import fs from "fs-extra";

import { extractTextureAssetFromDataString, extractTextureAssetFromUrl } from "../../tools/extract.mjs";

import { compressFileToKtx } from "./ktx.mjs";
import { compressFileToKtx2 } from "./ktx2.mjs";
import { EditorProjectCompressedTextureSoftware, getExtractedTextureOutputPath } from "./texture.mjs";

export interface IProcessExportedMaterialOptions {
	force: boolean;
	publicDir: string;
	exportedAssets: string[];
	optimize: boolean;
	compressedTextureSoftware?: EditorProjectCompressedTextureSoftware;
}

export async function processExportedMaterial(absolutePath: string, options: IProcessExportedMaterialOptions) {
	const materialData = await fs.readJSON(absolutePath);
	if (materialData.customType !== "BABYLON.NodeMaterial") {
		return;
	}

	const extractedTexturesOutputPath = getExtractedTextureOutputPath(options.publicDir);
	await fs.ensureDir(extractedTexturesOutputPath);

	const relativePaths = await extractNodeMaterialTextures(materialData, {
		extractedTexturesOutputPath,
	});

	await fs.writeJSON(absolutePath, materialData, {
		encoding: "utf-8",
	});

	await Promise.all(
		relativePaths.map(async (relativePath) => {
			const finalPath = join(options.publicDir, relativePath);

			options.exportedAssets.push(finalPath);

			if (options.compressedTextureSoftware === "PVRTexTool") {
				await compressFileToKtx(finalPath, { force: options.force, exportedAssets: options.exportedAssets });
			} else if (options.compressedTextureSoftware === "Khronos KTX-Software") {
				await compressFileToKtx2(finalPath, { force: options.force, exportedAssets: options.exportedAssets });
			}
		})
	);
}

export interface IExtractNodeMaterialTexturesOptions {
	extractedTexturesOutputPath: string;
}

export async function extractNodeMaterialTextures(materialData: any, options: IExtractNodeMaterialTexturesOptions) {
	const blocks = materialData.blocks.filter(
		(block: any) => (block.customType === "BABYLON.TextureBlock" || block.customType === "BABYLON.ImageSourceBlock") && block.texture?.name
	);

	const relativePaths: string[] = [];

	await Promise.all(
		blocks.map(async (block: any) => {
			if (block.texture?.name?.startsWith("http://") || block.texture.name.startsWith("https://")) {
				const relativePath = await extractTextureAssetFromUrl(block.texture.name, {
					...options,
				});

				if (relativePath) {
					relativePaths.push(relativePath);
					block.texture.name = block.texture.url = relativePath;
				}
			}

			if (block.texture.name?.startsWith("data:")) {
				const relativePath = await extractTextureAssetFromDataString(block.texture.name, {
					...options,
				});

				if (relativePath) {
					relativePaths.push(relativePath);
					block.texture.name = block.texture.url = relativePath;
				}
			}
		})
	);

	return relativePaths;
}
