import { tmpdir } from "os";
import { basename, join } from "path";
import { mkdtemp, writeFile, remove, rmdir } from "fs-extra";

import { Nullable } from "../../../shared/types";

import { BaseTexture, Tools as BabylonTools } from "babylonjs";

import { Editor } from "../editor";

import { Tools } from "./tools";

import { TextureAssets } from "../assets/textures";

export class TextureTools {
    /**
     * Merges the given diffuse texture with the given opacity texture.
     * @param editor defines the editor reference.
     * @param diffuse defines the diffuse texture reference.
     * @param opacity defines the opacity texture reference.
     */
    public static async MergeDiffuseWithOpacity(editor: Editor, diffuse: BaseTexture, opacity: BaseTexture): Promise<void> {
        const diffuseSize = diffuse.getSize();
        const opacitySize = opacity.getSize();

        if (diffuseSize.width !== opacitySize.width || diffuseSize.height !== opacitySize.height) {
            return;
        }

        const diffuseBuffer = diffuse.readPixels()?.buffer;
        if (!diffuseBuffer) { return; }

        const opacityBuffer = opacity.readPixels()?.buffer;
        if (!opacityBuffer) { return; }

        const diffusePixels = new Uint8ClampedArray(diffuseBuffer);
        const opacityPixels = new Uint8ClampedArray(opacityBuffer);

        for (let i = 0; i < diffusePixels.length; i+= 4) {
            diffusePixels[i + 3] = opacityPixels[i];
        }

        return this._ConvertPixelsToTextureFile(editor, diffuse, opacity, diffusePixels);
    }

    /**
     * Converts the given pixels to a texture file.
     */
    private static async _ConvertPixelsToTextureFile(editor: Editor, textureA: BaseTexture, textureB: BaseTexture, pixels: Uint8ClampedArray): Promise<void> {
        // Base canvas
        const canvas = document.createElement('canvas');
        canvas.width = textureA.getBaseSize().width;
        canvas.height = textureA.getBaseSize().height;

        const context = canvas.getContext('2d');
        if (!context) { return; }

        const imageData = new ImageData(pixels, canvas.width, canvas.height);
        context.putImageData(imageData, 0, 0);

        // Final canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = textureA.getBaseSize().width;
        finalCanvas.height = textureA.getBaseSize().height;

        const finalContext = finalCanvas.getContext('2d');
        if (!finalContext) { return; }
        finalContext.transform(1, 0, 0, -1, 0, canvas.height);
        finalContext.drawImage(canvas, 0, 0);

        const name = `${basename(textureA.name).split(".")[0]}_${basename(textureB.name).split(".")[0]}.png`;
        const blob = await this._CanvasToBlob(finalCanvas);

        context.restore();
        finalContext.restore();
        canvas.remove();
        finalCanvas.remove();

        if (!blob) { return; }

        // Write the temp file
        const tempDir = await mkdtemp(join(tmpdir(), "babylonjs-editor"));
        const textureDest = join(tempDir, name);

        await writeFile(textureDest, Buffer.from(await Tools.ReadFileAsArrayBuffer(blob)));

        // Add to assets
        editor.assets.selectTab(TextureAssets);
        await editor.assets.addFilesToAssets([{ path: textureDest, name }]);
        
        // Remove temp stuff
        try {
            await remove(textureDest);
            await rmdir(tempDir);
        } catch (e) {
            console.error("Failed to remove tmp dir", e);
        }
        
        editor.inspector.refreshDisplay();
    }

    /**
     * Converts the given canvas data to blob.
     */
    private static async _CanvasToBlob (canvas: HTMLCanvasElement): Promise<Nullable<Blob>> {
        return new Promise<Nullable<Blob>>((resolve) => {
            BabylonTools.ToBlob(canvas, b => resolve(b));
        });
    }
}
