import { join } from "node:path/posix";

import fs from "fs-extra";
import sharp from "sharp";

import { executeSimpleWorker } from "./worker.mjs";

export interface IExtractTextureAssetFromDataStringOptions {
	extractedTexturesOutputPath: string;
}

export async function extractTextureAssetFromDataString(dataString: string, options: IExtractTextureAssetFromDataStringOptions) {
	const split = dataString.split(",");
	const header = split[0];

	const headerSplit = header.split(";");
	const dataType = headerSplit[1];

	const byteString = split[1];

	if (dataType === "base64") {
		const buffer = Buffer.from(byteString, "base64");
		const image = sharp(buffer);

		const [metadata, hash] = await Promise.all([image.metadata(), executeSimpleWorker("workers/md5.mjs", buffer)]);

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
				console.error(`Unsupported embedded texture format while extracting texture: ${metadata.format}`);
				return null;
		}

		const outputFilename = join(options.extractedTexturesOutputPath, filename);
		if (!(await fs.pathExists(outputFilename))) {
			await fs.writeFile(outputFilename, buffer);
		}

		return join("assets", "editor-generated_extracted-textures", filename).replace(/\\/g, "/");
	}

	return null;
}

export interface IExtractTextureAssetFromUrlOptions {
	extractedTexturesOutputPath: string;
}

export async function extractTextureAssetFromUrl(url: string, options: IExtractTextureAssetFromUrlOptions) {
	try {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();

		const base64 = Buffer.from(arrayBuffer).toString("base64");
		const dataString = `data:${response.headers.get("content-type") ?? "image/unknown"};base64,${base64}`;

		return extractTextureAssetFromDataString(dataString, {
			...options,
		});
	} catch (e) {
		console.error(`Failed to extract texture from url "${url}": ${e.message}`);
	}

	return null;
}
