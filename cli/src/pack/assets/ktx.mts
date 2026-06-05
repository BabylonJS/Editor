import { basename, extname, join, dirname } from "node:path/posix";

import fs from "fs-extra";
import { PNG } from "pngjs";
import { createReadStream } from "node:fs";

import { executeAsync } from "../../tools/process.mjs";
import { pvrTexToolAbsolutePath } from "../../tools/ktx.mjs";

export type KTXToolsType = "-astc.ktx" | "-dxt.ktx" | "-pvrtc.ktx" | "-etc1.ktx" | "-etc2.ktx";

export const allKtxFormats: KTXToolsType[] = ["-astc.ktx", "-dxt.ktx", "-pvrtc.ktx", "-etc1.ktx", "-etc2.ktx"];

export const ktxSupportedextensions: string[] = [".png", ".jpg", ".jpeg", ".bmp"];

/**
 * Returns the filename of the compressed texture according to the given path and the destination format.
 * @param path defines the path of the texture to get its final name.
 * @param format defines the destination format of the texture.
 * @example image.png -> image-asct.ktx
 */
export function getCompressedTextureFilename(path: string, format: KTXToolsType) {
	return `${path.substring(0, path.lastIndexOf("."))}${format}`;
}

export type CompressFileToKtxOptions = {
	format: KTXToolsType;
	force?: boolean;
	exportedAssets?: string[];
	destinationFolder?: string;

	compressedTexturesEnabled: boolean;
	compressedEtc2Enabled?: boolean;
	compressedPvrtcEnabled?: boolean;
	compressedTextureQuality?: string;
};

const qualityDictionary: Record<string, Record<string, string>> = {
	"very-fast": {
		"-astc.ktx": "astcveryfast",
		"-pvrtc.ktx": "pvrtcfastest",
		"-etc1.ktx": "etcfast",
		"-etc2.ktx": "etcfast",
	},
	fast: {
		"-astc.ktx": "astcfast",
		"-pvrtc.ktx": "pvrtcfast",
		"-etc1.ktx": "etcfast",
		"-etc2.ktx": "etcfast",
	},
	normal: {
		"-astc.ktx": "astcmedium",
		"-pvrtc.ktx": "pvrtcnormal",
		"-etc1.ktx": "etcnormal",
		"-etc2.ktx": "etcnormal",
	},
	high: {
		"-astc.ktx": "astcexhaustive",
		"-pvrtc.ktx": "pvrtcbest",
		"-etc1.ktx": "etcslow",
		"-etc2.ktx": "etcslow",
	},
};

export async function compressFileToKtx(absolutePath: string, options: Partial<CompressFileToKtxOptions>): Promise<void> {
	if (options.format) {
		await compressFileToKtxFormat(absolutePath, options as CompressFileToKtxOptions);
	} else {
		await Promise.all(
			allKtxFormats.map(async (f) => {
				if (f === "-etc2.ktx" && !options.compressedEtc2Enabled) {
					return;
				}

				if (f === "-pvrtc.ktx" && !options.compressedPvrtcEnabled) {
					return;
				}

				return compressFileToKtxFormat(absolutePath, {
					...options,
					format: f,
				} as CompressFileToKtxOptions);
			})
		);
	}
}

export async function compressFileToKtxFormat(absolutePath: string, options: CompressFileToKtxOptions): Promise<string | null> {
	const name = basename(absolutePath);
	const extension = extname(name).toLocaleLowerCase();

	if (!ktxSupportedextensions.includes(extension)) {
		return null;
	}

	const filename = getCompressedTextureFilename(name, options.format);

	options.destinationFolder ??= dirname(absolutePath);
	options.destinationFolder = join(options.destinationFolder, filename);

	if (!options.compressedTexturesEnabled) {
		options.exportedAssets?.push(options.destinationFolder);
		return null;
	}

	if ((await fs.pathExists(options.destinationFolder)) && !options.force) {
		options.exportedAssets?.push(options.destinationFolder);
		return options.destinationFolder;
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

	if (!pvrTexToolAbsolutePath) {
		return null;
	}

	const quality = options.compressedTextureQuality ?? "very-fast";

	let command: string | null = null;
	switch (options.format) {
		case "-astc.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q ${qualityDictionary[quality]["-astc.ktx"]} -o "${options.destinationFolder}"`;
			break;

		case "-dxt.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "BC3" : "BC1"},UBN,lRGB -o "${options.destinationFolder}"`;
			break;

		case "-pvrtc.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTCI_2BPP_RGBA" : "PVRTCI_2BPP_RGB"},UBN,lRGB -q ${qualityDictionary[quality]["-pvrtc.ktx"]} -o "${options.destinationFolder}"`;
			break;

		case "-etc1.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q ${qualityDictionary[quality]["-etc1.ktx"]} -o "${options.destinationFolder}"`;
			break;

		case "-etc2.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q ${qualityDictionary[quality]["-etc2.ktx"]} -o "${options.destinationFolder}"`;
			break;
	}

	if (!command) {
		return null;
	}

	console.log(`Compressing image "${filename}"`);

	try {
		await executeAsync(command);
		console.log(`Compressed image "${filename}"`);
		options.exportedAssets?.push(options.destinationFolder);

		return options.destinationFolder;
	} catch (e) {
		console.error(`Failed to compress image "${filename}"`);
	}

	return null;
}
