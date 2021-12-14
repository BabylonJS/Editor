import { join, basename } from "path";
import { writeFile, pathExists } from "fs-extra";

import { Nullable } from "../../../shared/types";

import { Tools as BabylonTools, BaseTexture, Engine } from "babylonjs";

import { Tools } from "./tools";

export class GLTFTools {
    /**
     * Converts the embeded GLTF/GLB textures to files.
     * @param filesUrl the absolute path of the "files" folder of the project.
     * @param textures the array of textures to convert.
     * @param onTextureDone optional callback called on a texture has been done.
     */
    public static async TexturesToFiles(filesUrl: string, textures: BaseTexture[], onTextureDone?: (name: string) => void): Promise<void> {
        for (const texture of textures) {
            // Get texture url
            const textureUrl = join(filesUrl, basename(texture.name));
            if (await pathExists(textureUrl)) { continue; }

            // Get dimensions.
            const dimensions = texture.getBaseSize();
            if (!dimensions.width || !dimensions.height) { continue; }

            const pixels =
                texture.textureType === Engine.TEXTURETYPE_UNSIGNED_INT ?
                    await texture.readPixels() as Uint8Array :
                    await texture.readPixels() as Float32Array;

            const canvas = document.createElement("canvas");
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), dimensions.width, dimensions.height);

            const context = canvas.getContext("2d");
            if (!context) { continue; }
            context.putImageData(imageData, 0, 0);

            const blob = await this.CanvasToBlob(canvas);

            context.restore();
            canvas.remove();

            if (blob) {
                const buffer = await Tools.ReadFileAsArrayBuffer(blob);
                await writeFile(textureUrl, new Buffer(buffer));

                if (texture.metadata && texture.metadata.gltf) {
                    texture.metadata.gltf.editorDone = true;
                }
            }

            if (onTextureDone) {
                onTextureDone(texture.name);
            }
        }
    }

    /**
     * Converts the given canvas to a blob.
     * @param canvas the canvas reference to convert to blob.
     */
    public static CanvasToBlob(canvas: HTMLCanvasElement): Promise<Nullable<Blob>> {
        return new Promise<Nullable<Blob>>((resolve) => {
            BabylonTools.ToBlob(canvas, (b) => resolve(b));
        });
    }
}
