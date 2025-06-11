import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { PBRMaterial, Texture } from "babylonjs";
import { Editor, UniqueNumber } from "babylonjs-editor";

import { TextureUtils } from "../tools/textureMerger";

export class AlbedoOpacityPacker {
    /**
     * Packs the given albedo and opacity maps.
     * @param editor defines the reference to the editor.
     * @param material defines the reference to the material being configured.
     * @param albedoTexture defines the reference to the albedo texture.
     * @param opacityTexture defines the reference to the opacity texture.
     * @param rootFolder defines the root folder where to write the resulted texture.
     */
    public static async Pack(editor: Editor, material: PBRMaterial, albedoTexture: Texture | null, opacityTexture: Texture | null, rootFolder: string): Promise<void> {
        if (!editor.state.projectPath) {
            return;
        }

        const projectFolder = join(dirname(editor.state.projectPath), "/");

        if (albedoTexture && opacityTexture) {
            const log = await editor.layout.console.progress("Packing opacity texture in albedo texture alpha channel.");
            const packedAlbedoTexturePath = await TextureUtils.MergeTextures(albedoTexture, opacityTexture, rootFolder, (color1, color2) => ({
                r: color1.r,
                g: color1.g,
                b: color1.b,
                a: color2.r,
            }));

            if (packedAlbedoTexturePath) {
                albedoTexture!.dispose();
                opacityTexture!.dispose();

                try {
                    await remove(join(rootFolder, basename(albedoTexture.name)));
                    await remove(join(rootFolder, basename(opacityTexture.name)));
                } catch (e) {
                    // Catch silently.
                }

                const packedAlbedoTexture = await new Promise<Texture>((resolve, reject) => {
                    const texture = new Texture(packedAlbedoTexturePath, editor.layout.preview.scene, false, true, undefined, () => {
                        texture.uniqueId = UniqueNumber.Get();
                        texture.name = packedAlbedoTexturePath.replace(projectFolder, "");
                        texture.url = texture.name;
                        resolve(texture);
                    }, (_, e) => {
                        reject(e);
                        log.setState({ error: true });
                    });
                });

                material.albedoTexture = packedAlbedoTexture;
                packedAlbedoTexture.hasAlpha = true;
                material.useAlphaFromAlbedoTexture = true;
            }

            log.setState({ done: true });
        } else {
            if (albedoTexture) {
                material.albedoTexture = albedoTexture;
            }

            if (opacityTexture) {
                material.opacityTexture = opacityTexture;
                opacityTexture.getAlphaFromRGB = true;
            }
        }
    }
}
