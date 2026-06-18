import { extname } from "node:path/posix";
import { createReadStream } from "node:fs";

import fs from "fs-extra";
import { PNG } from "pngjs";

import { ktxSupportedextensions } from "./ktx.mjs";
import { executeAsync } from "../../tools/process.mjs";

export type CompressFileToKtxOptions = {
	force?: boolean;
	exportedAssets?: string[];
	destinationFolder?: string;

	compressedTexturesEnabled: boolean;
	compressedTextureQuality?: string;
};

export async function compressFileToKtx2(absolutePath: string, options: Partial<CompressFileToKtxOptions>) {
	const extension = extname(absolutePath).toLocaleLowerCase();

	if (!ktxSupportedextensions.includes(extension)) {
		return null;
	}

	const filename = `${absolutePath.substring(0, absolutePath.lastIndexOf("."))}.ktx2`;

	if (!options.compressedTexturesEnabled) {
		options.exportedAssets?.push(filename);
		return null;
	}

	if ((await fs.pathExists(filename)) && !options.force) {
		options.exportedAssets?.push(filename);
		return filename;
	}

	const hasAlpha = await new Promise<boolean>((resolve) => {
		const stream = createReadStream(absolutePath);

		stream
			.pipe(new PNG())
			.on("metadata", (p) => {
				resolve(p.alpha);
				stream.close();
			})
			.on("error", () => {
				resolve(false);
				stream.close();
			});
	});

	console.log(`Compressing image "${filename}"`);

	try {
		let quality = "0";
		switch (options.compressedTextureQuality) {
			case "very-fast":
				quality = "0";
				break;
			case "fast":
				quality = "1";
				break;
			case "normal":
				quality = "2";
				break;
			case "high":
				quality = "3";
				break;
		}

		await executeAsync(
			`ktx create --generate-mipmap --zstd 22 --convert-texcoord-origin bottom-left --encode uastc --uastc-quality ${quality} --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${absolutePath}" "${filename}"`
		);
		console.log(`Compressed image "${filename}"`);
		options.exportedAssets?.push(filename);

		return filename;
	} catch (e) {
		console.error(`Failed to compress image "${filename}"`);
	}

	return null;
}
