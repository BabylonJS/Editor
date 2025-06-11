import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { TextureUtils } from "../tools/textureMerger";

export class MaskPacker {
    /**
     * Packs the given reflectivity and microsurface maps.
     * @param editor defines the reference to the editor.
     * @param material defines the reference to the material being configured.
     * @param maskTexture defines the reference to the mask texture.
     * @param rootFolder defines the root folder where to write the resulted texture.
     */
    public static async Pack(editor: Editor, material: PBRMaterial, maskTexture: Texture | null, rootFolder: string): Promise<void> {
        if (!editor.state.projectPath) {
            return;
        }

        const projectFolder = join(dirname(editor.state.projectPath), "/");

        if (maskTexture) {
            const log = await editor.layout.console.progress("Packing mask texture alpha channel.");
            const packedMaskTexturePath = await TextureUtils.MergeTextures(maskTexture, maskTexture, rootFolder, (color1) => ({
                r: color1.r,
                g: color1.g,
                b: color1.b,
                a: color1.r,
            }));

            if (packedMaskTexturePath) {
                maskTexture!.dispose();

                try {
                    await remove(join(rootFolder, basename(maskTexture.name)));
                } catch (e) {
                    // Catch silently.
                }

                const packedMaskTexture = await new Promise<Texture>((resolve, reject) => {
                    const texture = new Texture(packedMaskTexturePath, editor.layout.preview.scene, false, true, undefined, () => {
                        texture.uniqueId = UniqueNumber.Get();
                        texture.name = packedMaskTexturePath.replace(projectFolder, "");
                        texture.url = texture.name;
                        texture.hasAlpha = true;
                        resolve(texture);
                    }, (_, e) => {
                        reject(e);
                        log.setState({ error: true });
                    });
                });

                material.albedoTexture = packedMaskTexture;
                material.useAlphaFromAlbedoTexture = false;

                log.setState({ done: true });
            } else {
                material.albedoTexture = maskTexture;
            }
        }
    }
}
