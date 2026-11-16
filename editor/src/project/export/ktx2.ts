import { pathExists, remove } from "fs-extra";
import { basename, dirname, extname, join } from "path/posix";

import sharp from "sharp";
import { PNG } from "pngjs";
import { createReadStream, existsSync } from "fs";

import { executeAsync } from "../../tools/process";

import { Editor } from "../../editor/main";

import { ktxSupportedextensions } from "./ktx";

/**
 * Where installers put the KTX-Software CLI on Windows. Used when `ktx` is not on the PATH the editor inherited: a
 * PATH entry added by the installer only reaches processes started after it, and an editor launched from a terminal or
 * an IDE opened earlier keeps the old one - so a fresh install fails with "'ktx' is not recognized" until everything
 * is restarted.
 */
const KTX_WINDOWS_INSTALL_PATHS = ["C:/Program Files/KTX-Software/bin/ktx.exe", "C:/Program Files (x86)/KTX-Software/bin/ktx.exe"];

let ktxCliCommand: string | null = null;

/**
 * Returns the command that runs the KTX-Software CLI if it can be found: `ktx` when the PATH has it, otherwise the
 * quoted path of a standard install, and null when neither has it.
 *
 * Only a found command is remembered. A miss is looked up again on the next call, so installing the CLI while the
 * editor is open works without a restart - the case the install paths exist for.
 */
export function findKtxCliCommand(): string | null {
	if (ktxCliCommand) {
		return ktxCliCommand;
	}

	const windows = process.platform === "win32";
	const onPath = (process.env.PATH ?? "").split(windows ? ";" : ":").some((dir) => dir && existsSync(join(dir.replace(/\\/g, "/"), windows ? "ktx.exe" : "ktx")));

	if (onPath) {
		ktxCliCommand = "ktx";
	} else {
		const installed = windows ? KTX_WINDOWS_INSTALL_PATHS.find((path) => existsSync(path)) : undefined;
		if (installed) {
			ktxCliCommand = `"${installed}"`;
		}
	}

	return ktxCliCommand;
}

/**
 * Returns the command that runs the KTX-Software CLI: the one found by `findKtxCliCommand`, or plain `ktx` so the
 * shell still gets to try when it was not found.
 */
export function getKtxCliCommand(): string {
	return findKtxCliCommand() ?? "ktx";
}

/**
 * Returns the message logged when compressing an image failed. When the CLI cannot be found it says so, and how to
 * fix it, instead of leaving the user with a bare "failed" for every texture.
 * @param filename defines the name of the image that failed to compress.
 */
export function getKtx2CompressionErrorMessage(filename: string): string {
	if (findKtxCliCommand()) {
		return `Failed to compress image "${filename}"`;
	}

	return `Failed to compress image "${filename}": KTX-Software CLI not found. Install it from https://github.com/KhronosGroup/KTX-Software/releases - if it is already installed, restart the editor.`;
}

/**
 * Returns the filename of the compressed texture according to the given path and the destination format.
 * @param path defines the path of the texture to get its final name.
 * @param format defines the destination format of the texture.
 * @example image.png -> image-asct.ktx
 */
export function getKtx2CompressedTextureFilename(path: string) {
	return `${path.substring(0, path.lastIndexOf("."))}.ktx2`;
}

export type CompressFileToKtx2Options = {
	force?: boolean;
	exportedAssets?: string[];
	destinationFolder?: string;
};

export async function compressFileToKtx2(editor: Editor, absolutePath: string, options: Partial<CompressFileToKtx2Options>): Promise<string | null> {
	const name = basename(absolutePath);
	const extension = extname(name).toLocaleLowerCase();

	if (!ktxSupportedextensions.includes(extension)) {
		return null;
	}

	const filename = getKtx2CompressedTextureFilename(name);

	options.destinationFolder ??= dirname(absolutePath);
	options.destinationFolder = join(options.destinationFolder, filename);

	if (!editor.state.compressedTexturesEnabled) {
		options.exportedAssets?.push(options.destinationFolder);
		return null;
	}

	if ((await pathExists(options.destinationFolder)) && !options.force) {
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

	const log = await editor.layout.console.progress(`Compressing image "${filename}"`);

	let source = absolutePath;
	try {
		source = await toPowerOfTwoSource(absolutePath, options.destinationFolder);

		// `--zstd`: UASTC alone is a fixed 8 bits per texel plus mips - 22 MB on disk for a 4096 lightmap. zstd brings
		// that to 11.2 MB (measured; the PNG is 9.8 MB) while the GPU still receives the same UASTC blocks.
		await executeAsync(
			`${getKtxCliCommand()} create --generate-mipmap --convert-texcoord-origin bottom-left --encode uastc --uastc-quality 0 --zstd 18 --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${source}" "${options.destinationFolder}"`
		);

		log.setState({
			done: true,
			message: `Compressed image "${filename}"`,
		});

		options.exportedAssets?.push(options.destinationFolder);

		return options.destinationFolder;
	} catch (e) {
		log.setState({
			error: true,
			message: getKtx2CompressionErrorMessage(filename),
		});
	} finally {
		if (source !== absolutePath) {
			await remove(source);
		}
	}

	return null;
}

/**
 * The nearest power of two to `size`, and never under 4.
 *
 * The GPU formats UASTC transcodes to (BC7, ASTC, ETC2) are 4x4 blocks: a level whose sides are not multiples of four
 * is rejected ("Invalid compressed image size"), and a side that is not a power of two stops being a multiple of four
 * a few mips down ("Level of detail outside of range"). A power of two is a multiple of four at every level that
 * needs to be.
 */
export function nearestPowerOfTwo(size: number): number {
	return Math.max(4, 2 ** Math.round(Math.log2(Math.max(size, 1))));
}

/**
 * The image to encode: the source itself when both sides are already powers of two, otherwise a copy resampled to the
 * nearest ones, written beside the destination. The source is never modified; uvs are normalised, so the stretch is
 * invisible on the surface.
 */
async function toPowerOfTwoSource(absolutePath: string, destination: string): Promise<string> {
	const { width, height } = await sharp(absolutePath).metadata();
	if (!width || !height) {
		return absolutePath;
	}

	const potWidth = nearestPowerOfTwo(width);
	const potHeight = nearestPowerOfTwo(height);
	if (potWidth === width && potHeight === height) {
		return absolutePath;
	}

	const resized = `${destination}.pot.png`;
	await sharp(absolutePath).resize(potWidth, potHeight, { fit: "fill" }).png().toFile(resized);
	return resized;
}
