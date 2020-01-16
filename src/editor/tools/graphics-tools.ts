import { Engine, BaseTexture, FilesInputStore, Tools as BabylonTools, Texture } from 'babylonjs';

export default class GraphicsTools {
    /**
     * Configures the given texture to retrieve its pixels and create a new file (blob)
     * @param tex the texture to transform to a blob
     */
    public static async TextureToFile (tex: BaseTexture): Promise<Blob> {
        // Retrieve pixels
        const dimensions = tex.getBaseSize();
        if (!dimensions.width || !dimensions.height)
            return null;

        const pixels =
            tex.textureType === Engine.TEXTURETYPE_UNSIGNED_INT ?
            tex.readPixels() as Uint8Array :
            tex.readPixels() as Float32Array;

        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), tex.getBaseSize().width, tex.getBaseSize().height);

        const context = canvas.getContext("2d");
        context.putImageData(imageData, 0, 0);

        const blob = await this.CanvasToBlob(canvas);

        context.restore();
        canvas.remove();

        return blob;
    }

    /**
     * Converts the given canvas data to blob
     * @param canvas the canvas to take its data and convert to a blob
     */
    public static async CanvasToBlob (canvas: HTMLCanvasElement): Promise<Blob> {
        return new Promise<Blob>((resolve) => {
            BabylonTools.ToBlob(canvas, b => resolve(b));
        });
    }

    /**
     * Merges the given bump texture and displacement texture to create a parallax texture.
     * @param bumpTexture the original bump texture.
     * @param displacementTexture the selected displacement texture to merge with the normal map.
     */
    public static async MergeBumpWithDisplacement (bumpTexture: Texture, displacementTexture: Texture): Promise<void> {
        const bumpPixels = new Uint8ClampedArray(bumpTexture.readPixels().buffer);
        const displacementPixels = new Uint8ClampedArray(displacementTexture.readPixels().buffer);

        for (let i = 0; i < bumpPixels.length; i += 4)
            bumpPixels[i + 3] *= (displacementPixels[i] / 255);

        // Base canvas
        const canvas = document.createElement('canvas');
        canvas.width = bumpTexture.getBaseSize().width;
        canvas.height = bumpTexture.getBaseSize().height;

        const imageData = new ImageData(bumpPixels, canvas.width, canvas.height);

        const context = canvas.getContext('2d');
        context.putImageData(imageData, 0, 0);

        // Final canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = bumpTexture.getBaseSize().width;
        finalCanvas.height = bumpTexture.getBaseSize().height;

        const finalContext = finalCanvas.getContext('2d');
        finalContext.transform(1, 0, 0, -1, 0, canvas.height);
        finalContext.drawImage(canvas, 0, 0);

        const name = bumpTexture.name + BabylonTools.RandomId() + '.png';
        const file = await this.CanvasToBlob(finalCanvas);
        file['name'] = name.toLowerCase();
        FilesInputStore.FilesToLoad[name.toLowerCase()] = <File> file;

        const newTexture = new Texture('file:' + name.toLowerCase(), bumpTexture.getScene());
        newTexture._invertY = true;
        newTexture.name = name.toLowerCase();
        newTexture.url = name.toLowerCase();

        context.restore();
        finalContext.restore();
        canvas.remove();
        finalCanvas.remove();
    }
}
