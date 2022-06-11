import { tmpdir } from "os";
import { basename, join } from "path";
import { mkdtemp, writeFile, remove, rmdir } from "fs-extra";

import { Nullable } from "../../../../shared/types";

import { BaseTexture, Engine, Tools as BabylonTools } from "babylonjs";

import { Editor } from "../../editor";

import { Tools } from "../tools";

import { TextureAssets } from "../../assets/textures";

export class TextureTools {
    /**
     * Merges the given diffuse texture with the given opacity texture.
     * @param editor defines the editor reference.
     * @param diffuse defines the diffuse texture reference.
     * @param opacity defines the opacity texture reference.
     */
    public static async MergeDiffuseWithOpacity(editor: Editor, diffuse: BaseTexture, opacity: BaseTexture): Promise<Nullable<string>> {
        const diffuseSize = diffuse.getSize();
        const opacitySize = opacity.getSize();

        if (diffuseSize.width !== opacitySize.width || diffuseSize.height !== opacitySize.height) {
            return null;
        }

        const diffuseBuffer = (await diffuse.readPixels())?.buffer;
        if (!diffuseBuffer) { return null; }

        const opacityBuffer = (await opacity.readPixels())?.buffer;
        if (!opacityBuffer) { return null; }

        const diffusePixels = new Uint8ClampedArray(diffuseBuffer);
        const opacityPixels = new Uint8ClampedArray(opacityBuffer);

        for (let i = 0; i < diffusePixels.length; i += 4) {
            diffusePixels[i + 3] = opacityPixels[i];
        }

        const name = `${basename(diffuse.name).split(".")[0]}_${basename(opacity.name).split(".")[0]}.png`;
        return this._ConvertPixelsToTextureFile(editor, name, diffuse, diffusePixels);
    }

    /**
     * Converts the given pixels to a texture file.
     */
    private static async _ConvertPixelsToTextureFile(editor: Editor, name: string, texture: BaseTexture, pixels: Uint8ClampedArray): Promise<Nullable<string>> {
        // Base canvas
        const canvas = document.createElement("canvas");
        canvas.width = texture.getBaseSize().width;
        canvas.height = texture.getBaseSize().height;

        const context = canvas.getContext("2d");
        if (!context) { return null; }

        const imageData = new ImageData(pixels, canvas.width, canvas.height);
        context.putImageData(imageData, 0, 0);

        // Final canvas
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = texture.getBaseSize().width;
        finalCanvas.height = texture.getBaseSize().height;

        const finalContext = finalCanvas.getContext("2d");
        if (!finalContext) { return null; }
        finalContext.transform(1, 0, 0, -1, 0, canvas.height);
        finalContext.drawImage(canvas, 0, 0);

        const blob = await this.CanvasToBlob(finalCanvas);

        context.restore();
        finalContext.restore();
        canvas.remove();
        finalCanvas.remove();

        if (!blob) { return null; }

        // Write the temp file
        const tempDir = await mkdtemp(join(tmpdir(), "babylonjs-editor"));
        const textureDest = join(tempDir, name);

        await writeFile(textureDest, Buffer.from(await Tools.ReadFileAsArrayBuffer(blob)));

        // Add to assets
        editor.assets.selectTab(TextureAssets);

        // Remove temp stuff
        try {
            await remove(textureDest);
            await rmdir(tempDir);
        } catch (e) {
            console.error("Failed to remove tmp dir", e);
        }

        return name;
    }

    /**
     * Converts the given canvas data to blob.
     */
    public static async CanvasToBlob(canvas: HTMLCanvasElement): Promise<Nullable<Blob>> {
        return new Promise<Nullable<Blob>>((resolve) => {
            BabylonTools.ToBlob(canvas, b => resolve(b));
        });
    }

    /**
     * Converts the given texture into an array buffer as image/png.
     * @param texture defines the reference to the texture to convert to array buffer.
     */
    public static async ConvertTextureToBuffer(texture: BaseTexture): Promise<Nullable<ArrayBuffer>> {
        // Get pixels
        const pixels =
            texture.textureType === Engine.TEXTURETYPE_UNSIGNED_INT ?
                await texture.readPixels() as Uint8Array :
                await texture.readPixels() as Float32Array;

        // Get dimensions.
        const dimensions = texture.getBaseSize();
        if (!dimensions.width || !dimensions.height) { return null; }

        // Canvas
        const canvas = document.createElement("canvas");
        canvas.width = texture.getBaseSize().width;
        canvas.height = texture.getBaseSize().height;

        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), dimensions.width, dimensions.height);

        const context = canvas.getContext("2d");
        if (!context) { return null; }
        context.putImageData(imageData, 0, 0);

        // Final canvas
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = texture.getBaseSize().width;
        finalCanvas.height = texture.getBaseSize().height;

        const finalContext = finalCanvas.getContext("2d");
        if (!finalContext) { return null; }
        finalContext.transform(1, 0, 0, -1, 0, canvas.height);
        finalContext.drawImage(canvas, 0, 0);

        // Return image buffer
        const blob = await this.CanvasToBlob(finalCanvas);
        if (!blob) { return null; }

        const buffer = await Tools.ReadFileAsArrayBuffer(blob);
        return buffer;
    }

    /**
     * Converts the given octet-stream to buffer.
     * @param stream defines the reference to the stream string.
     */
    public static ConvertOctetStreamToBuffer(stream: string): Buffer {
        const data = stream.indexOf("data:") === 0 ? stream.split(",")[1] : stream;
        const buffer = Buffer.alloc(data.length, data, "base64");

        return buffer;
    }
}
