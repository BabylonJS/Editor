import { IGenerator } from "./types";
import Socket from "./socket";
import SocketHelper from "./socket";

export default class Document {
    private static _PendingModifications: number[] = [];

    /**
     * Inits all documents to send the existing/opened documents.
     * @param generator the generator reference.
     */
    public static async Init (generator: IGenerator): Promise<void> {
        const ids = await generator.getOpenDocumentIDs();
        ids.forEach(id => this._SendPixMap(generator, id));
    }

    /**
     * Called on a photoshop document changed.
     * @param generator the generator reference.
     */
    public static async OnDocumentChanged (generator: IGenerator): Promise<void> {
        // Get infos
        const id = await generator.evaluateJSXString<number>("app.activeDocument.id");
        if (!id)
            return;

        // Pending
        if (this._PendingModifications.indexOf(id) !== -1)
            return;

        this._PendingModifications.push(id);
        
        // Send!
        await this._SendPixMap(generator, id);
    }

    /**
     * Sends the pixmap.
     * @param generator the generator reference.
     * @param id the id of the pixmap.
     */
    private static async _SendPixMap (generator: IGenerator, id: number): Promise<void> {
        // Get pixmap
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

        // Free pending
        this._PendingModifications.splice(this._PendingModifications.indexOf(id), 1);

        // Send
        SocketHelper.Server.emit('document', {
            name: infos.file,
            width: pixmap.width,
            height: pixmap.height,
            pixels: pixmap.pixels
        });

        // Other pending.
        let index = 0;
        while ((index = this._PendingModifications.pop()))
            await this._SendPixMap(generator, index);
    }
}
