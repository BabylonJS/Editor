import { join } from "path/posix";
import { pathExists, writeFile } from "fs-extra";

import sharp from "sharp";

import { Editor } from "../../editor/main";

import { executeSimpleWorker } from "../../tools/worker";

export interface IExtractNodeMaterialTexturesOptions {
	materialData: any;
	assetsDirectory: string;
}

export async function extractNodeMaterialTextures(editor: Editor, options: IExtractNodeMaterialTexturesOptions) {
	const blocks = options.materialData.blocks.filter(
		(block: any) => (block.customType === "BABYLON.TextureBlock" || block.customType === "BABYLON.ImageSourceBlock") && block.texture?.name
	);

	await Promise.all(
		blocks.map(async (block: any) => {
			if (!block.texture.name?.startsWith("data:")) {
				return;
			}

			const split = block.texture.name.split(",");
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
						return editor.layout.console.error(`Unsupported embedded texture format for NodeMaterial "${options.materialData.name}": ${metadata.format}`);
				}

				const outputFilename = join(options.assetsDirectory, filename);
				if (!(await pathExists(outputFilename))) {
					await writeFile(outputFilename, buffer);
				}

				block.texture.name = block.texture.url = join("assets", "editor-generated_extracted-textures", filename).replace(/\\/g, "/");
			}
		})
	);
}
