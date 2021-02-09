export enum OffscreenAssetsHelperMesh {
    /**
     * Defines the mesh to create to be a sphere.
     */
    Sphere = 0,
}

export class OffscreenAssetsHelper {
    /**
     * The canvas used to render elements.
     */
    public canvas: HTMLCanvasElement;

    private _inited: boolean = false;
    private _worker: Worker;

    /**
     * Constructor.
     */
    public constructor() {
        // Canvas
        this.canvas = document.createElement("canvas");
        this.canvas.style.visibility = "hidden";
        this.canvas.width = 100;
        this.canvas.height = 100;
        document.body.appendChild(this.canvas);
    }

    /**
     * Inits the helper.
     */
    public async init(): Promise<void> {
        if (this._inited) { return Promise.resolve(); }
        this._inited = true;

        const offscreen = this.canvas.transferControlToOffscreen();

        this._worker = new Worker("../build/src/renderer/editor/tools/offscreen-assets-helper/index.js");
        return this._getPromise("init", { canvas: offscreen }, [offscreen]);
    }

    /**
     * Resets the helper.
     */
    public reset(): Promise<void> {
        return this._getPromise("reset");
    }

    /**
     * Creates a new mesh.
     * @param type the type of the mesh to created.
     */
    public createMesh(type: OffscreenAssetsHelperMesh): Promise<void> {
        return this._getPromise("createMesh", { type });
    }

    /**
     * Laods the given mesh.
     * @param rootUrl the root url containing the mesh's file.
     * @param filename the name of the mesh file to load.
     */
    public importMesh(rootUrl: string, filename: string): Promise<boolean> {
        return this._getPromise("importMesh", { rootUrl, filename });
    }

    /**
     * Sets the new material to the current mesh.
     * @param json the JSON representation of the material.
     * @param rootUrl the rootUrl containing the material's assets.
     */
    public setMaterial(json: any, rootUrl?: string): Promise<void> {
        return this._getPromise("setMaterial", { json, rootUrl });
    }

    /**
     * Disposes the current material.
     */
    public disposeMaterial(): Promise<void> {
        return this._getPromise("disposeMaterial");
    }

    /**
     * Returns the current screenshot of the canvas.
     */
    public async getScreenshot(): Promise<string> {
        return this._getPromise("getScreenshot");
    }

    /**
     * Returns the promise resolved on the postMessage has been completed.
     */
    private _getPromise<T>(id: string, data: any = { }, options?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this._worker.addEventListener("message", (ev) => {
                if (ev.data.id !== id) { return; }

                if (ev.data.error) { return reject(); }
                return resolve(ev.data.response as T);
            }, { once: true });
            this._postMessage(id, data, options);
        });
    }

    /**
     * Post message to send to the worker.
     */
    private _postMessage(id: string, data: any = { }, options?: any): void {
        this._worker.postMessage({ id, ...data }, options);
    }
}

/**
 * Export a default instance.
 */
export const assetsHelper = new OffscreenAssetsHelper();
