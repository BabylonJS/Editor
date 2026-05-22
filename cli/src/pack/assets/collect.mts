import { extname, join } from "node:path/posix";

import { pathExists } from "fs-extra";

import { supportedExtensions } from "./process.mjs";
import { allKtxFormats, getCompressedTextureFilename, ktxSupportedextensions } from "./ktx.mjs";

const binaryGeometryExtension = ".babylonbinarymeshdata";
const collectedSupportedExtensions: string[] = [...supportedExtensions, binaryGeometryExtension];

export async function collectUsedAssetsForScene(scene: any, publicDir: string) {
	const result: string[] = [];
	const stringValues: string[] = [];

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

	await Promise.all(
		stringValues.map(async (value) => {
			const extension = extname(value).toLowerCase();
			if (extension === binaryGeometryExtension) {
				return result.push(value);
			}

			const absolutePath = join(publicDir, value);
			if (await pathExists(absolutePath)) {
				result.push(value);

				if (ktxSupportedextensions.includes(extension)) {
					for (const format of allKtxFormats) {
						const compressedTexturePath = join(publicDir, getCompressedTextureFilename(value, format));
						if (await pathExists(compressedTexturePath)) {
							result.push(getCompressedTextureFilename(value, format));
						}
					}
				}
			}
		})
	);

	return result;
}
