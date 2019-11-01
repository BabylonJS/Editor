import { Engine, BaseTexture, FilesInputStore, Tags, Tools as BabylonTools } from 'babylonjs';

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
}
