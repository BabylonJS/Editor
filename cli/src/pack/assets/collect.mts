import { extname, join } from "node:path/posix";

import sharp from "sharp";
import { pathExists } from "fs-extra";

import { unique } from "../../tools/array.mjs";
import { getPowerOfTwoUntil } from "../../tools/scalar.mjs";

import { DownscaledTextureSize } from "./texture.mjs";
import { supportedExtensions, supportedImagesExtensions } from "./process.mjs";
import { allKtxFormats, getCompressedTextureFilename, ktxSupportedextensions } from "./ktx.mjs";

const binaryGeometryExtension = ".babylonbinarymeshdata";
const collectedSupportedExtensions: string[] = [...supportedExtensions, binaryGeometryExtension];

async function _checkKtxSupportForTexture(value: string, publicDir: string, result: string[]) {
	for (const format of allKtxFormats) {
		const compressedTexturePath = join(publicDir, getCompressedTextureFilename(value, format));
		const finalName = getCompressedTextureFilename(value, format);

		if (!result.includes(finalName) && (await pathExists(compressedTexturePath))) {
			result.push(finalName);
		}
	}
}

export async function collectUsedAssetsForScene(scene: any, publicDir: string) {
	const result: string[] = [];
	let stringValues: string[] = [];

	function recursivelyCollect(root: any) {
		for (const thing in root) {
			if (!root.hasOwnProperty(thing)) {
				continue;
			}

			const value = root[thing];

			if (typeof value === "string") {
				const extension = extname(value).toLowerCase();
				if (extension && collectedSupportedExtensions.includes(extension)) {
					stringValues.push(value);
				}
			} else if (typeof value === "object") {
				if (Array.isArray(value)) {
					value.forEach((v) => recursivelyCollect(v));
				} else {
					recursivelyCollect(value);
				}
			}
		}
	}

	recursivelyCollect(scene);

	stringValues = unique(stringValues);

	await Promise.all(
		stringValues.map(async (value) => {
			const extension = extname(value).toLowerCase();
			if (extension === binaryGeometryExtension) {
				return result.push(value);
			}

			const absolutePath = join(publicDir, value);
			if (await pathExists(absolutePath)) {
				if (!result.includes(value)) {
					result.push(value);
				}

				if (ktxSupportedextensions.includes(extension)) {
					await _checkKtxSupportForTexture(value, publicDir, result);
				}

				if (supportedImagesExtensions.includes(extension)) {
					const sharpImage = sharp(absolutePath);
					const { width, height } = await sharpImage.metadata();
					if (!width || !height) {
						return;
					}

					const availableSizes: DownscaledTextureSize[] = [];
					const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);

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

					await Promise.all(
						availableSizes.map(async (size) => {
							const nameWithoutExtension = value.substring(0, value.lastIndexOf("."));
							const finalName = `${nameWithoutExtension}_${size.width}_${size.height}${extension}`;
							const finalPath = join(publicDir, finalName);

							if (!result.includes(finalName) && (await pathExists(finalPath))) {
								result.push(finalName);
							}

							if (ktxSupportedextensions.includes(extension)) {
								await _checkKtxSupportForTexture(finalName, publicDir, result);
							}
						})
					);
				}
			}
		})
	);

	return result;
}
