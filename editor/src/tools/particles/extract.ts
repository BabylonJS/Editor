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
				const relativePath = await extractTextureAssetFromDataString(editor, {
					dataString: ps.particleTexture.name,
					assetsDirectory: options.assetsDirectory,
				});

				if (relativePath) {
					ps.particleTexture.name = relativePath;
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
				const relativePath = await extractTextureAssetFromUrl(editor, {
					url: block.url,
					assetsDirectory: options.assetsDirectory,
				});

				if (relativePath) {
					block.url = relativePath;
				}
			}

			if (block.textureDataUrl?.startsWith("data:")) {
				const relativePath = await extractTextureAssetFromDataString(editor, {
					dataString: block.textureDataUrl,
					assetsDirectory: options.assetsDirectory,
				});

				if (relativePath) {
					delete block.textureDataUrl;
					block.url = relativePath;
				}
			}
		})
	);
}
