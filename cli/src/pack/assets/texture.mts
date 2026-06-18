import { basename, dirname, extname, join } from "node:path/posix";

import sharp from "sharp";
import fs from "fs-extra";

import { getPowerOfTwoUntil } from "../../tools/scalar.mjs";

import { compressFileToKtx } from "./ktx.mjs";
import { compressFileToKtx2 } from "./ktx2.mjs";
import { IProcessAssetFileOptions } from "./process.mjs";

export function getExtractedTextureOutputPath(publicDir: string) {
	return join(publicDir, "assets", "editor-generated_extracted-textures");
}

export type DownscaledTextureSize = {
	width: number;
	height: number;
};

export type EditorProjectCompressedTextureSoftware = "PVRTexTool" | "Khronos KTX-Software";

export interface IComputeExportedTextureOptions extends IProcessAssetFileOptions {
	force: boolean;
	exportedAssets: string[];

	compressedTexturesEnabled: boolean;
	compressedTextureSoftware?: EditorProjectCompressedTextureSoftware;
}

export async function processExportedTexture(absolutePath: string, options: IComputeExportedTextureOptions): Promise<void> {
	const extension = extname(absolutePath);

	const metadata = await sharp(absolutePath).metadata();
	if (!metadata.width || !metadata.height) {
		return console.error(`Failed to compute exported image "${absolutePath}". Image metadata is invalid.`);
	}

	const width = metadata.width;
	const height = metadata.height;

	const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

	const availableSizes: DownscaledTextureSize[] = [];

	let midWidth = (width * 0.66) >> 0;
	let midHeight = (height * 0.66) >> 0;

	if (isPowerOfTwo) {
		midWidth = getPowerOfTwoUntil(midWidth);
		midHeight = getPowerOfTwoUntil(midHeight);
	}

	availableSizes.push({
		width: midWidth,
		height: midHeight,
	});

	let lowWidth = (width * 0.33) >> 0;
	let lowHeight = (height * 0.33) >> 0;

	if (isPowerOfTwo) {
		lowWidth = getPowerOfTwoUntil(lowWidth);
		lowHeight = getPowerOfTwoUntil(lowHeight);
	}

	availableSizes.push({
		width: lowWidth,
		height: lowHeight,
	});

	for (const size of availableSizes) {
		const nameWithoutExtension = basename(absolutePath).replace(extension, "");
		const finalName = `${nameWithoutExtension}_${size.width}_${size.height}${extension}`;
		const finalPath = join(dirname(absolutePath), finalName);

		options.exportedAssets.push(finalPath);

		if (options.force || !(await fs.pathExists(finalPath))) {
			try {
				const buffer = await sharp(absolutePath).resize(size.width, size.height).toBuffer();

				await fs.writeFile(finalPath, buffer);

				console.log(`Exported scaled texture "${finalName}"`);

				options.onStepChanged?.("assets", {
					message: `Exported scaled texture "${finalName}"`,
				});
			} catch (e) {
				console.error(`Failed to export image scaled image "${finalName}"`);
			}
		}

		if (options.compressedTextureSoftware === "PVRTexTool") {
			await compressFileToKtx(finalPath, { ...options });
		} else if (options.compressedTextureSoftware === "Khronos KTX-Software") {
			await compressFileToKtx2(finalPath, { ...options });
		}
	}
}
