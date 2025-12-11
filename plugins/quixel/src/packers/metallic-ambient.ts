import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { TextureUtils } from "../tools/textureMerger";

export class MetallicAmbientPacker {
	/**
	 * Packs the given reflectivity and microsurface maps.
	 * @param editor defines the reference to the editor.
	 * @param material defines the reference to the material being configured.
	 * @param metallicTexture defines the reference to the metallic texture.
	 * @param roughnessTexture defines the reference to the roughness texture.
	 * @param rootFolder defines the root folder where to write the resulted texture.
	 */
	public static async Pack(editor: Editor, material: PBRMaterial, metallicTexture: Texture | null, ambientTexture: Texture | null, rootFolder: string): Promise<void> {
		if (!editor.state.projectPath) {
			return;
		}

		const projectFolder = join(dirname(editor.state.projectPath), "/");

		if (metallicTexture && ambientTexture) {
			const log = await editor.layout.console.progress("Packing ambient texture in metallic texture red channel.");
			const packedMetallicTexturePath = await TextureUtils.MergeTextures(metallicTexture, ambientTexture, rootFolder, (color1, color2) => ({
				r: color2.r,
				g: color1.g,
				b: color1.b,
				a: color1.a,
			}));

			if (packedMetallicTexturePath) {
				metallicTexture!.dispose();
				ambientTexture!.dispose();

				try {
					await remove(join(rootFolder, basename(ambientTexture.name)));
					await remove(join(rootFolder, basename(metallicTexture.name)));
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
				material.useAmbientOcclusionFromMetallicTextureRed = true;
			}

			log.setState({ done: true });
		} else {
			material.ambientTexture = ambientTexture!;
		}
	}
}
