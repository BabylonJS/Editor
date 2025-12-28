import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { TextureUtils } from "../tools/textureMerger";

export class MetallicRoughnessPacker {
	/**
	 * Packs the given reflectivity and microsurface maps.
	 * @param editor defines the reference to the editor.
	 * @param material defines the reference to the material being configured.
	 * @param metallicTexture defines the reference to the metallic texture.
	 * @param roughnessTexture defines the reference to the roughness texture.
	 * @param rootFolder defines the root folder where to write the resulted texture.
	 */
	public static async Pack(editor: Editor, material: PBRMaterial, metallicTexture: Texture | null, roughnessTexture: Texture | null, rootFolder: string): Promise<void> {
		if (!editor.state.projectPath) {
			return;
		}

		const projectFolder = join(dirname(editor.state.projectPath), "/");

		if (metallicTexture && roughnessTexture) {
			const log = await editor.layout.console.progress("Packing roughness texture in metallic texture green channel.");
			const packedMetallicTexturePath = await TextureUtils.MergeTextures(metallicTexture, roughnessTexture, rootFolder, (color1, color2) => ({
				r: 0,
				g: color2.r,
				b: color1.r,
				a: 255,
			}));

			if (packedMetallicTexturePath) {
				metallicTexture!.dispose();
				roughnessTexture!.dispose();

				try {
					await remove(join(rootFolder, basename(metallicTexture.name)));
					await remove(join(rootFolder, basename(roughnessTexture.name)));
				} catch (e) {
					// Catch silently.
				}

				const packedMetallicTexture = await new Promise<Texture>((resolve, reject) => {
					const texture = new Texture(
						packedMetallicTexturePath,
						editor.layout.preview.scene,
						false,
						true,
						undefined,
						() => {
							texture.uniqueId = UniqueNumber.Get();
							texture.name = packedMetallicTexturePath.replace(projectFolder, "");
							texture.url = texture.name;
							resolve(texture);
						},
						(_, e) => {
							reject(e);
							log.setState({ error: true });
						}
					);
				});

				material.metallicTexture = packedMetallicTexture;
				material.metallic = 1;
				material.roughness = 1;
				material.useRoughnessFromMetallicTextureAlpha = false;
				material.useRoughnessFromMetallicTextureGreen = true;
				material.useMetallnessFromMetallicTextureBlue = true;
			}

			log.setState({ done: true });
		} else if (metallicTexture) {
			material.metallicTexture = metallicTexture;
			material.metallic = 1;
			material.roughness = 0;
			material.useRoughnessFromMetallicTextureAlpha = false;
			material.useRoughnessFromMetallicTextureGreen = false;
			material.useMetallnessFromMetallicTextureBlue = true;
		} else if (roughnessTexture) {
			material.metallicTexture = roughnessTexture;
			material.metallic = 0;
			material.roughness = 1;
			material.useRoughnessFromMetallicTextureAlpha = false;
			material.useRoughnessFromMetallicTextureGreen = true;
			material.useMetallnessFromMetallicTextureBlue = false;
		}
	}
}
