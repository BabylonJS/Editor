import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { TextureUtils } from "../tools/textureMerger";

export class ReflectivityGlossinessPacker {
	/**
	 * Packs the given reflectivity and microsurface maps.
	 * @param editor defines the reference to the editor.
	 * @param material defines the reference to the material being configured.
	 * @param reflectivityTexture defines the reference to the reflectivity texture.
	 * @param microSurfaceTexture defines the reference to the microsurface texture.
	 * @param rootFolder defines the root folder where to write the resulted texture.
	 */
	public static async Pack(editor: Editor, material: PBRMaterial, reflectivityTexture: Texture | null, microSurfaceTexture: Texture | null, rootFolder: string): Promise<void> {
		if (!editor.state.projectPath) {
			return;
		}

		const projectFolder = join(dirname(editor.state.projectPath), "/");

		if (reflectivityTexture && microSurfaceTexture) {
			const log = await editor.layout.console.progress("Packing micro surface texture in reflectivity texture alpha channel.");
			const packedReflectivityTexturePath = await TextureUtils.MergeTextures(reflectivityTexture, microSurfaceTexture, rootFolder, (color1, color2) => ({
				r: color1.r,
				g: color1.g,
				b: color1.b,
				a: color2.r,
			}));

			if (packedReflectivityTexturePath) {
				reflectivityTexture!.dispose();
				microSurfaceTexture!.dispose();

				try {
					await remove(join(rootFolder, basename(reflectivityTexture.name)));
					await remove(join(rootFolder, basename(microSurfaceTexture.name)));
				} catch (e) {
					// Catch silently.
				}

				const packedReflectivityTexture = await new Promise<Texture>((resolve, reject) => {
					const texture = new Texture(
						packedReflectivityTexturePath,
						editor.layout.preview.scene,
						false,
						true,
						undefined,
						() => {
							texture.uniqueId = UniqueNumber.Get();
							texture.name = packedReflectivityTexturePath.replace(projectFolder, "");
							texture.url = texture.name;
							resolve(texture);
						},
						(_, e) => {
							reject(e);
							log.setState({ error: true });
						}
					);
				});

				material.reflectivityTexture = packedReflectivityTexture;
				material.useMicroSurfaceFromReflectivityMapAlpha = true;
			}

			log.setState({ done: true });
		} else {
			material.reflectivityTexture = reflectivityTexture!;
			material.microSurfaceTexture = microSurfaceTexture!;
		}
	}
}
