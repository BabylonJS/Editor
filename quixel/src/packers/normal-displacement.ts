import { remove } from "fs-extra";
import { basename, join, dirname } from "path";

import { Editor } from "babylonjs-editor";
import { PBRMaterial, Texture } from "babylonjs";

import { UniqueNumber } from "../tools/id";
import { TextureUtils } from "../tools/textureMerger";

export class NormalDisplacementPacker {
    /**
     * Packs the given reflectivity and microsurface maps.
     * @param editor defines the reference to the editor.
     * @param material defines the reference to the material being configured.
     * @param bumpTexture defines the reference to the reflectivity texture.
     * @param displacementTexture defines the reference to the microsurface texture.
     * @param rootFolder defines the root folder where to write the resulted texture.
     */
    public static async Pack(editor: Editor, material: PBRMaterial, bumpTexture: Texture | null, displacementTexture: Texture | null, rootFolder: string): Promise<void> {
        if (!editor.state.projectPath) {
            return;
        }

        const projectFolder = join(dirname(editor.state.projectPath), "/");

        if (bumpTexture && displacementTexture) {
            editor.layout.console.log("Packing displacement texture in bump texture alpha channel to use parallax mapping.");
            const packedBumpTexturePath = await TextureUtils.MergeTextures(bumpTexture, displacementTexture, rootFolder, (color1, color2) => ({
                r: color1.r,
                g: color1.g,
                b: color1.b,
                a: color2.r < 128 ? 128 : 255,
            }));

            if (packedBumpTexturePath) {
                bumpTexture!.dispose();
                displacementTexture!.dispose();

                try {
                    await remove(join(rootFolder, basename(bumpTexture.name)));
                    await remove(join(rootFolder, basename(displacementTexture.name)));
                } catch (e) {
                    // Catch silently.
                }

                const packedBumpTexture = await new Promise<Texture>((resolve, reject) => {
                    const texture = new Texture(packedBumpTexturePath, editor.layout.preview.scene, false, true, undefined, () => {
                        texture.uniqueId = UniqueNumber.Get();
                        texture.name = packedBumpTexturePath.replace(projectFolder, "");
                        texture.url = texture.name;
                        resolve(texture);
                    }, (_, e) => {
                        reject(e);
                    });
                });

                material.bumpTexture = packedBumpTexture;
                material.useParallax = true;
                material.useParallaxOcclusion = true;
                material.parallaxScaleBias = -0.01;
            }
        } else {
            material.bumpTexture = bumpTexture!;
        }
    }
}
