import Socket from './socket';
import { IGenerator } from './types';

/**
 * Inits the plugin.
 */
export async function init (generator: IGenerator): Promise<void> {
    // Connect server
    await Socket.Connect();

    // Bind events
    generator.onPhotoshopEvent("imageChanged", async () => {
        const id = await generator.evaluateJSXString<number>("app.activeDocument.id");
        if (!id)
            return;

        const pixmap = await generator.getDocumentPixmap(id, { });
        if (!pixmap)
            return;

        // Set pixels order
        for (var i=0; i < pixmap.pixels.length; i += pixmap.channelCount) {
            var a = pixmap.pixels[i];
            var r = pixmap.pixels[i + 1];
            var g = pixmap.pixels[i + 2];
            var b = pixmap.pixels[i + 3];

            pixmap.pixels[i] = r;
            pixmap.pixels[i + 1] = g;
            pixmap.pixels[i + 2] = b;
            pixmap.pixels[i + 3] = a;
        }

        const infos = await generator.getDocumentInfo(id);
        if (!infos)
            return;

        Socket.Server.emit('document', {
            name: infos.file,
            width: pixmap.width,
            height: pixmap.height,
            pixels: pixmap.pixels
        });
    });
}
