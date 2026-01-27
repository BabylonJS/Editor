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
 * Returns the absolute path to the compressed textures CLI path (PVRTexTool).
 * The value is retrieved from the local storage so it's per computer and not per project.
 */
export function getCompressedTexturesCliPath() {
	let value = "";

	try {
		value = localStorage.getItem("editor-compressed-textures-cli-path") ?? "";
	} catch (e) {
		// Catch silently.
	}

	return value || null;
}

/**
 * Sets the absolute path to the compressed textures CLI path (PVRTexTool).
 * The value is stored in the local storage so it's per computer and not per project.
 */
export function setCompressedTexturesCliPath(absolutePath: string) {
	try {
		localStorage.setItem("editor-compressed-textures-cli-path", absolutePath);
	} catch (e) {
		// Catch silently.
	}
}

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
};

export async function compressFileToKtx(absolutePath: string, options: Partial<CompressFileToKtxOptions>): Promise<void> {
	if (options.format) {
		await compressFileToKtxFormat(absolutePath, options as CompressFileToKtxOptions);
	} else {
		await Promise.all(
			allKtxFormats.map((f) =>
				compressFileToKtxFormat(absolutePath, {
					...options,
					format: f,
				})
			)
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

	// if (!editor.state.compressedTexturesEnabled) {
	// 	options.exportedAssets?.push(options.destinationFolder);
	// 	return null;
	// }

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

	let command: string | null = null;
	switch (options.format) {
		case "-astc.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ASTC_8x8,UBN,lRGB -q astcveryfast -o "${options.destinationFolder}"`;
			break;

		case "-dxt.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "BC2" : "BC1"},UBN,lRGB -o "${options.destinationFolder}"`;
			break;

		case "-pvrtc.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -square + -m -dither -ics lRGB ${hasAlpha ? "-l" : ""} -f ${hasAlpha ? "PVRTCI_2BPP_RGBA" : "PVRTCI_2BPP_RGB"},UBN,lRGB -q pvrtcfastest -o "${options.destinationFolder}"`;
			break;

		case "-etc1.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ETC1,UBN,lRGB -q etcfast -o "${options.destinationFolder}"`;
			break;

		case "-etc2.ktx":
			command = `"${pvrTexToolAbsolutePath}" -i "${absolutePath}" -flip y -pot + -m -dither -ics lRGB -f ${hasAlpha ? "ETC2_RGBA" : "ETC2_RGB"},UBN,lRGB -q etcfast -o "${options.destinationFolder}"`;
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
