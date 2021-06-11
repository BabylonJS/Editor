import { Observable } from "babylonjs";
import { IGenerator, IPixMap } from "./types";

export interface IDocument extends IPixMap {
    /**
     * Defines the name of the document.
     */
    name: string;
}

export class Document {
    /**
     * Notifies the listeners that a document changed.
     */
    public onDocumentChangedObservable: Observable<IDocument> = new Observable<IDocument>();

    private _generator: IGenerator;

    /**
     * Inits the plugin.
     */
    public async init(generator: IGenerator): Promise<void> {
        this._generator = generator;
        this._generator.onPhotoshopEvent("imageChanged", () => this._onDocumentChanged());
    }

    /**
     * Closes the plugin.
     */
    public close(): void {
        this.onDocumentChangedObservable.clear();
    }

    /**
     * Syncs Photoshop and the editor.
     */
    public async sync(): Promise<void> {
        const documentIds = await this._generator.getOpenDocumentIDs();
        documentIds.forEach((id) => this._sendPixMap(id));
    }

    /**
     * Called on a document changed in Photoshop.
     */
    private async _onDocumentChanged(): Promise<void> {
        const id = await this._generator.evaluateJSXString<number>("app.activeDocument.id");
        if (!id) { return; }

        this._sendPixMap(id);
    }

    /**
     * Sends the mixmap to the editor or the given document.
     */
    private async _sendPixMap(id: number): Promise<void> {
        // Get pixmap
        const pixmap = await this._generator.getDocumentPixmap(id, { });
        if (!pixmap) {
            return;
        }

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

        // Get infos
        const infos = await this._generator.getDocumentInfo(id);
        if (!infos) { return; }

        // Notify!
        this.onDocumentChangedObservable.notifyObservers({
            name: infos.file,
            ...pixmap,
        });
    }
}
