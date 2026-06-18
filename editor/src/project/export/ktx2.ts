import { pathExists } from "fs-extra";
import { basename, dirname, extname, join } from "path/posix";

import { PNG } from "pngjs";
import { createReadStream } from "fs";

import { executeAsync } from "../../tools/process";

import { Editor } from "../../editor/main";

import { ktxSupportedextensions } from "./ktx";

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

	try {
		await executeAsync(
			`ktx create --generate-mipmap --convert-texcoord-origin bottom-left --encode uastc --uastc-quality 0 --format ${hasAlpha ? "R8G8B8A8_SRGB" : "R8G8B8_SRGB"} "${absolutePath}" "${options.destinationFolder}"`
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
	}

	return null;
}
