import { Editor } from "../../editor/main";

import { extractTextureAssetFromDataString, extractTextureAssetFromUrl, IExtractTextureAssetFromDataStringResult } from "../assets/extract";

export interface IExtractParticleSystemTexturesOptions {
	assetsDirectory: string;
}

export async function extractParticleSystemTextures(editor: Editor, particleSystemData: any, options: IExtractParticleSystemTexturesOptions) {
	let relativePath: IExtractTextureAssetFromDataStringResult | null = null;

	if (particleSystemData.texture?.name.startsWith("http://") || particleSystemData.texture?.name.startsWith("https://")) {
		relativePath = await extractTextureAssetFromUrl(editor, {
			...options,
			url: particleSystemData.texture.name,
		});
	} else if (particleSystemData.texture?.name.startsWith("data:")) {
		relativePath = await extractTextureAssetFromDataString(editor, {
			...options,
			dataString: particleSystemData.texture.name,
		});
	}

	if (relativePath) {
		particleSystemData.texture.name = relativePath;
		particleSystemData.texture.url = particleSystemData.texture.name;
	}

	return relativePath;
}

export interface IExtractNodeParticleSystemSetTexturesOptions extends IExtractParticleSystemTexturesOptions {
	particlesData: any;
}

export async function extractNodeParticleSystemSetTextures(editor: Editor, options: IExtractNodeParticleSystemSetTexturesOptions) {
	const blocks = options.particlesData.blocks.filter((block) => block.customType === "BABYLON.ParticleTextureSourceBlock");

	const relativePaths: string[] = [];

	await Promise.all(
		blocks.map(async (block: any) => {
			if (block.url?.startsWith("http://") || block.url?.startsWith("https://")) {
				const result = await extractTextureAssetFromUrl(editor, {
					url: block.url,
					assetsDirectory: options.assetsDirectory,
				});

				if (result) {
					block.metadata ??= {};
					block.metadata.baseSize = result.baseSize;
					block.url = `/scene/${result.relativePath}`;
					relativePaths.push(result.relativePath);
				}
			} else if (block.textureDataUrl?.startsWith("data:")) {
				const result = await extractTextureAssetFromDataString(editor, {
					dataString: block.textureDataUrl,
					assetsDirectory: options.assetsDirectory,
				});

				if (result) {
					delete block.textureDataUrl;
					block.metadata ??= {};
					block.metadata.baseSize = result.baseSize;
					block.url = `/scene/${result.relativePath}`;
					relativePaths.push(result.relativePath);
				}
			} else {
				relativePaths.push(block.url.replace("/scene", ""));
			}
		})
	);

	return relativePaths;
}
