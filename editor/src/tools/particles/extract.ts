import { Editor } from "../../editor/main";

import { isTexture } from "../guards/texture";

import { extractTextureAssetFromDataString, extractTextureAssetFromUrl } from "../assets/extract";

export interface IExtractParticleSystemTexturesOptions {
	assetsDirectory: string;
}

export async function extractParticleSystemTextures(editor: Editor, options: IExtractParticleSystemTexturesOptions) {
	const particleSystems = editor.layout.preview.scene.particleSystems;

	await Promise.all(
		particleSystems.map(async (ps) => {
			if (ps.particleTexture?.name.startsWith("data:")) {
				const result = await extractTextureAssetFromDataString(editor, {
					dataString: ps.particleTexture.name,
					assetsDirectory: options.assetsDirectory,
				});

				if (result) {
					ps.particleTexture.name = result.relativePath;
					if (isTexture(ps.particleTexture)) {
						ps.particleTexture.url = ps.particleTexture.name;
					}
				}
			}
		})
	);
}

export interface IExtractNodeParticleSystemSetTexturesOptions extends IExtractParticleSystemTexturesOptions {
	particlesData: any;
}

export async function extractNodeParticleSystemSetTextures(editor: Editor, options: IExtractNodeParticleSystemSetTexturesOptions) {
	const blocks = options.particlesData.blocks.filter((block) => block.customType === "BABYLON.ParticleTextureSourceBlock");

	await Promise.all(
		blocks.map(async (block: any) => {
			if (block.url) {
				const result = await extractTextureAssetFromUrl(editor, {
					url: block.url,
					assetsDirectory: options.assetsDirectory,
				});

				if (result) {
					block.metadata ??= {};
					block.metadata.baseSize = result.baseSize;
					block.url = result.relativePath;
				}
			}

			if (block.textureDataUrl?.startsWith("data:")) {
				const result = await extractTextureAssetFromDataString(editor, {
					dataString: block.textureDataUrl,
					assetsDirectory: options.assetsDirectory,
				});

				if (result) {
					delete block.textureDataUrl;
					block.metadata ??= {};
					block.metadata.baseSize = result.baseSize;
					block.url = result.relativePath;
				}
			}
		})
	);
}
