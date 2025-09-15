import { Editor } from "../../editor/main";

import { extractTextureAssetFromDataString, extractTextureAssetFromUrl } from "../assets/extract";

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
			if (block.texture?.name?.startsWith("http://") || block.texture.name.startsWith("https://")) {
				const relativePath = await extractTextureAssetFromUrl(editor, {
					url: block.texture.name,
					assetsDirectory: options.assetsDirectory,
				});

				if (relativePath) {
					block.texture.name = block.texture.url = relativePath;
				}
			}

			if (block.texture.name?.startsWith("data:")) {
				const relativePath = await extractTextureAssetFromDataString(editor, {
					dataString: block.texture.name,
					assetsDirectory: options.assetsDirectory,
				});

				if (relativePath) {
					block.texture.name = block.texture.url = relativePath;
				}
			}
		})
	);
}
