import { extname, join } from "node:path/posix";
import { createReadStream, existsSync } from "node:fs";

import fs from "fs-extra";
import sharp from "sharp";
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

/**
 * Where installers put the KTX-Software CLI on Windows. Used when `ktx` is not on the PATH this process inherited: a
 * PATH entry added by the installer only reaches processes started after it, and a pack launched from an editor or a
 * terminal opened earlier keeps the old one - so a fresh install fails with "'ktx' is not recognized" until everything
 * is restarted.
 */
const KTX_WINDOWS_INSTALL_PATHS = ["C:/Program Files/KTX-Software/bin/ktx.exe", "C:/Program Files (x86)/KTX-Software/bin/ktx.exe"];

let ktxCliCommand: string | null = null;

/** The command that runs the KTX-Software CLI: `ktx` when the PATH has it, otherwise the quoted path of an install. */
export function getKtxCliCommand(): string {
	if (ktxCliCommand) {
		return ktxCliCommand;
	}

	const windows = process.platform === "win32";
	const onPath = (process.env.PATH ?? "").split(windows ? ";" : ":").some((dir) => dir && existsSync(join(dir.replace(/\\/g, "/"), windows ? "ktx.exe" : "ktx")));

	const installed = windows ? KTX_WINDOWS_INSTALL_PATHS.find((path) => existsSync(path)) : undefined;

	ktxCliCommand = !onPath && installed ? `"${installed}"` : "ktx";
	return ktxCliCommand;
}

/**
 * The nearest power of two to `size`, and never under 4.
 *
 * The GPU formats UASTC transcodes to (BC7, ASTC, ETC2) are 4x4 blocks: a level whose sides are not multiples of four
 * is rejected ("Invalid compressed image size"), and a side that is not a power of two stops being a multiple of four
 * a few mips down ("Level of detail outside of range"). The scaled copies the pack makes for lower qualities - 198x198,
 * 99x99 - hit this as often as the originals.
 */
export function nearestPowerOfTwo(size: number): number {
	return Math.max(4, 2 ** Math.round(Math.log2(Math.max(size, 1))));
}

/**
 * The image to encode: the source itself when both sides are already powers of two, otherwise a copy resampled to the
 * nearest ones, written beside the output. The source is never modified; uvs are normalised, so the stretch is
 * invisible on the surface.
 */
async function toPowerOfTwoSource(absolutePath: string, output: string): Promise<string> {
	const { width, height } = await sharp(absolutePath).metadata();
	if (!width || !height) {
		return absolutePath;
	}

	const potWidth = nearestPowerOfTwo(width);
	const potHeight = nearestPowerOfTwo(height);
	if (potWidth === width && potHeight === height) {
		return absolutePath;
	}

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

		source = await toPowerOfTwoSource(absolutePath, filename);

		await executeAsync(
			`${getKtxCliCommand()} create --generate-mipmap --zstd 22 --convert-texcoord-origin bottom-left --encode uastc --uastc-quality ${quality} --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${source}" "${filename}"`
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
