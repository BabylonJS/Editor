import { pathExists, remove } from "fs-extra";
import { basename, dirname, extname, join } from "path/posix";

import sharp from "sharp";
import { PNG } from "pngjs";
import { createReadStream } from "fs";

import { executeAsync } from "../../tools/process";
import { getNearestPowerOfTwo } from "../../tools/maths/scalar";

import { Editor } from "../../editor/main";

import { ktxSupportedextensions } from "./ktx";

/**
 * The smallest side KTX2 accepts here: the GPU formats UASTC transcodes to (BC7, ASTC, ETC2) work on 4x4 blocks.
 */
const KTX2_MIN_TEXTURE_SIZE = 4;

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
		source = await getKtx2EncodableSource(editor, absolutePath, options.destinationFolder);

		// `--zstd`: UASTC alone is a fixed 8 bits per texel plus mips - 22 MB on disk for a 4096 lightmap. zstd brings
		// that to 11.2 MB (measured; the PNG is 9.8 MB) while the GPU still receives the same UASTC blocks.
		await executeAsync(
			`ktx create --generate-mipmap --convert-texcoord-origin bottom-left --encode uastc --uastc-quality 0 --zstd 18 --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${source}" "${options.destinationFolder}"`
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
			message: `Failed to compress image "${filename}"`,
		});
	} finally {
		if (source !== absolutePath) {
			await remove(source);
		}
	}

	return null;
}

/**
 * Returns the image to give to the KTX-Software CLI.
 *
 * UASTC needs every mip level to be a multiple of 4x4 blocks: a side that is not a multiple of four is rejected
 * ("Invalid compressed image size"), and a side that is not a power of two stops being one a few mips down
 * ("Level of detail outside of range"). Without this, `ktx create` fails on such textures (and on the 66% / 33%
 * scaled copies of them) and the scene is exported without their KTX2 version.
 *
 * When both sides are already powers of two the source is returned as is. Otherwise a temporary copy resampled to the
 * nearest powers of two is written beside the destination, a warning is logged, and the caller removes the copy once
 * encoded. The source texture itself is never modified: uvs are normalised, so the stretch is invisible on the surface.
 */
async function getKtx2EncodableSource(editor: Editor, absolutePath: string, destination: string): Promise<string> {
	const { width, height } = await sharp(absolutePath).metadata();
	if (!width || !height) {
		return absolutePath;
	}

	const potWidth = getNearestPowerOfTwo(width, KTX2_MIN_TEXTURE_SIZE);
	const potHeight = getNearestPowerOfTwo(height, KTX2_MIN_TEXTURE_SIZE);
	if (potWidth === width && potHeight === height) {
		return absolutePath;
	}

	editor.layout.console.warn(`Image "${basename(absolutePath)}" is ${width}x${height}, not a power of two: its KTX2 version is resized to ${potWidth}x${potHeight}.`);

	const resized = `${destination}.pot.png`;
	await sharp(absolutePath).resize(potWidth, potHeight, { fit: "fill" }).png().toFile(resized);
	return resized;
}
