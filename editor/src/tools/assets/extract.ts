import { join } from "path/posix";
import { pathExists, writeFile } from "fs-extra";

import sharp from "sharp";

import { Editor } from "../../editor/main";

import { executeSimpleWorker } from "../worker";

export interface IExtractTextureAssetFromDataStringOptions {
	dataString: string;
	assetsDirectory: string;
}

export async function extractTextureAssetFromDataString(editor: Editor, options: IExtractTextureAssetFromDataStringOptions) {
	const split = options.dataString.split(",");
	const header = split[0];

	const headerSplit = header.split(";");
	const dataType = headerSplit[1];

	const byteString = split[1];

	if (dataType === "base64") {
		const buffer = Buffer.from(byteString, "base64");
		const image = sharp(buffer);

		const [metadata, hash] = await Promise.all([image.metadata(), executeSimpleWorker("workers/md5.js", buffer)]);

		let filename: string;
		switch (metadata.format) {
			case "png":
				filename = `${hash}.png`;
				break;

			case "jpg":
			case "jpeg":
				filename = `${hash}.jpg`;
				break;

			default:
				return editor.layout.console.error(`Unsupported embedded texture format while extracting texture: ${metadata.format}`);
		}

		const outputFilename = join(options.assetsDirectory, filename);
		if (!(await pathExists(outputFilename))) {
			await writeFile(outputFilename, buffer);
		}

		return {
			baseSize: {
				width: metadata.width,
				height: metadata.height,
			},
			relativePath: join("assets", "editor-generated_extracted-textures", filename).replace(/\\/g, "/"),
		};
	}

	return null;
}

export interface IExtractTextureAssetFromUrlOptions {
	url: string;
	assetsDirectory: string;
}

export async function extractTextureAssetFromUrl(editor: Editor, options: IExtractTextureAssetFromUrlOptions) {
	try {
		const response = await fetch(options.url);
		const arrayBuffer = await response.arrayBuffer();

		const base64 = Buffer.from(arrayBuffer).toString("base64");
		const dataString = `data:${response.headers.get("content-type") ?? "image/unknown"};base64,${base64}`;

		return extractTextureAssetFromDataString(editor, {
			dataString,
			assetsDirectory: options.assetsDirectory,
		});
	} catch (e) {
		editor.layout.console.error(`Failed to extract texture from url "${options.url}": ${e.message}`);
	}
}
