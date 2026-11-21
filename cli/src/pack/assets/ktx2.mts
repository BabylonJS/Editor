import { extname } from "node:path/posix";
import { createReadStream } from "node:fs";

import fs from "fs-extra";
import sharp from "sharp";
import { PNG } from "pngjs";

import { ktxSupportedextensions } from "./ktx.mjs";
import { executeAsync } from "../../tools/process.mjs";
import { getNearestPowerOfTwo } from "../../tools/scalar.mjs";

export type CompressFileToKtxOptions = {
	force?: boolean;
	exportedAssets?: string[];
	destinationFolder?: string;

	compressedTexturesEnabled: boolean;
	compressedTextureQuality?: string;
};

/**
 * The smallest side KTX2 accepts here: the GPU formats UASTC transcodes to (BC7, ASTC, ETC2) work on 4x4 blocks.
 */
const KTX2_MIN_TEXTURE_SIZE = 4;

/**
 * Returns the image to give to the KTX-Software CLI.
 *
 * UASTC needs every mip level to be a multiple of 4x4 blocks: a side that is not a multiple of four is rejected
 * ("Invalid compressed image size"), and a side that is not a power of two stops being one a few mips down
 * ("Level of detail outside of range"). Without this, `ktx create` fails on such textures (and on the 66% / 33%
 * scaled copies of them) and the scene is packed without their KTX2 version.
 *
 * When both sides are already powers of two the source is returned as is. Otherwise a temporary copy resampled to the
 * nearest powers of two is written beside the output, a warning is logged, and the caller removes the copy once
 * encoded. The source texture itself is never modified: uvs are normalised, so the stretch is invisible on the surface.
 */
async function getKtx2EncodableSource(absolutePath: string, output: string): Promise<string> {
	const { width, height } = await sharp(absolutePath).metadata();
	if (!width || !height) {
		return absolutePath;
	}

	const potWidth = getNearestPowerOfTwo(width, KTX2_MIN_TEXTURE_SIZE);
	const potHeight = getNearestPowerOfTwo(height, KTX2_MIN_TEXTURE_SIZE);
	if (potWidth === width && potHeight === height) {
		return absolutePath;
	}

	console.warn(`Image "${absolutePath}" is ${width}x${height}, not a power of two: its KTX2 version is resized to ${potWidth}x${potHeight}`);

	const resized = `${output}.pot.png`;
	await sharp(absolutePath).resize(potWidth, potHeight, { fit: "fill" }).png().toFile(resized);
	return resized;
}

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

	let source = absolutePath;
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

		source = await getKtx2EncodableSource(absolutePath, filename);

		await executeAsync(
			`ktx create --generate-mipmap --zstd 22 --convert-texcoord-origin bottom-left --encode uastc --uastc-quality ${quality} --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${source}" "${filename}"`
		);
		console.log(`Compressed image "${filename}"`);
		options.exportedAssets?.push(filename);

		return filename;
	} catch (e) {
		console.error(`Failed to compress image "${filename}"`);
	} finally {
		if (source !== absolutePath) {
			await fs.remove(source);
		}
	}

	return null;
}
