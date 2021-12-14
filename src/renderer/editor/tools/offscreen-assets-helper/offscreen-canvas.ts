/**
 * TODO: use offscreen canvas for assets rendering.
 */
import "../../../module";

import {
    Engine, Scene, TargetCamera, Vector3, Color4, HemisphericLight, Mesh, Nullable,
    Material, SceneLoader, Tools, SerializationHelper, CubeTexture,
} from "babylonjs";

import "babylonjs-materials";
import "babylonjs-loaders";

import { FBXLoader } from "../../loaders/fbx/loader";

class OffscreenAssets {
    /**
     * The canvas used to render elements.
     */
    public canvas: OffscreenCanvas;
    /**
     * The engine used to render elements in the canvas.
     */
    public engine: Engine;
    /**
     * The scene used to rendere elements.
     */
    public scene: Scene;
    /**
     * The camera used to have a view on the scene.
     */
    public camera: TargetCamera;
    /**
     * The light used to get a view on materials
     */
    public light: HemisphericLight;

    private _mesh: Nullable<Mesh> = null;

    /**
     * Defines the instance of the assets helper.
     * @hidden
     */
    public static _Instance: OffscreenAssets;

    /**
     * Constructor.
     * @param canvas the canvas element
     */
    public constructor(canvas: OffscreenCanvas) {
        this.canvas = canvas;

        // Babylon.JS stuffs
        this.engine = new Engine(this.canvas as any, true, {
            antialias: true,
            audioEngine: true,
            disableWebGL2Support: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            useHighPrecisionFloats: true,
            preserveDrawingBuffer: true,
            stencil: true,
        });
        this.engine.enableOfflineSupport = false;

        if (!Engine.audioEngine) {
            Engine.audioEngine = { } as any;
        }

        // Loaders
        SceneLoader.RegisterPlugin(new FBXLoader());

        // Configure serialization helper
        const textureParser = SerializationHelper._TextureParser;
        SerializationHelper._TextureParser = (source, scene, rootUrl) => {
            if (source.isCube && !source.isRenderTarget && source.files && source.metadata?.isPureCube) {
                source.files.forEach((f, index) => {
                    source.files[index] = rootUrl + f;
                });
            }

            return textureParser(source, scene, rootUrl);
        };

        this.reset();
    }

    /**
     * Resets the assets helper.
     */
    public reset(): void {
        if (this._mesh) { this._mesh.dispose(true, true); }
        if (this.scene) {
            this.scene["_inputManager"].detachControl = () => { };
            this.scene.dispose();
        }

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        this.scene.defaultMaterial.backFaceCulling = false;

        this.camera = new TargetCamera("AssetsHelperCamera", new Vector3(0, 0, 0), this.scene, true);
        this.camera.minZ = 0.1;
        
        this.light = new HemisphericLight("AssetsHelperLight", new Vector3(0, 1, 0), this.scene);

        const texture = CubeTexture.CreateFromPrefilteredData("../../../../../../assets/textures/studio.env", this.scene);
        this.scene.environmentTexture = texture;
    }

    /**
     * Returns a screenshot of the scene once the scene is ready.
     */
    public async getScreenshot(): Promise<string> {
        return new Promise<string>((resolve) => {
            // After 10 seconds, resolve if failed.
            const timeoutId = setTimeout(async () => {
                this.scene.render();

                const blob = await this.canvas.convertToBlob({ type: "image/png" });
                Tools.ReadFileAsDataURL(blob, (data) => resolve(data), null!);
            }, 10000);

            this.scene.executeWhenReady(async () => {
                await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));

                const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

                this.scene.meshes.forEach((d) => {
                    const scaling = Vector3.Zero();
                    d.getWorldMatrix().decompose(scaling, undefined, undefined);

                    const bMinimum = d.getBoundingInfo()?.minimum.multiply(scaling);
                    const bMaximum = d.getBoundingInfo()?.maximum.multiply(scaling);

                    if (!bMinimum || !bMaximum) { return; }

                    maximum.x = Math.max(bMaximum.x, maximum.x);
                    maximum.y = Math.max(bMaximum.y, maximum.y);
                    maximum.z = Math.max(bMaximum.z, maximum.z);

                    minimum.x = Math.min(bMinimum.x, minimum.x);
                    minimum.y = Math.min(bMinimum.y, minimum.y);
                    minimum.z = Math.min(bMinimum.z, minimum.z);
                });

                const center = Vector3.Center(minimum, maximum);
                const distance = Vector3.Distance(minimum, maximum) * 0.5;

                this.camera.position = center.add(new Vector3(distance, distance, distance));
                this.camera.setTarget(center);

                this.scene.render();

                const blob = await this.canvas.convertToBlob({ type: "image/png" });
                Tools.ReadFileAsDataURL(blob, (data) => {
                    clearTimeout(timeoutId);
                    resolve(data);
                }, null!);
            });

            this.scene._checkIsReady();
        });
    }

    /**
     * Creates a new mesh according to the given type.
     * @param type the type of the mesh to create.
     */
    public createMesh(type: number): void {
        switch (type) {
            case 0: this._mesh = Mesh.CreateSphere("MaterialsSphere", 32, 1, this.scene, false); break;
            default: break;
        }
    }

    /**
     * Laods the given mesh.
     * @param rootUrl the root url containing the mesh's file.
     * @param filename the name of the mesh file to load.
     */
    public async importMesh(rootUrl: string, filename: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, 10000);

            try {
                await SceneLoader.ImportMeshAsync("", rootUrl, filename, this.scene, null, null);
                resolve(true);
            } catch (e) {
                resolve(false);
            }

            clearTimeout(timeoutId);
        });
    }

    /**
     * Sets the new material to the current mesh.
     * @param json the JSON representation of the material.
     * @param rootUrl the rootUrl containing the material's assets.
     */
    public setMaterial(json: any, rootUrl: string): void {
        if (!this._mesh) { return; }
        this._mesh.material = Material.Parse(json, this.scene, rootUrl);
    }

    /**
     * Disposes the current mesh material.
     */
    public disposeMaterial(): void {
        if (!this._mesh?.material) { return; }
        this._mesh.material.dispose(true, true);
    }
}

/**
 * Called for each message sent from the editor.
 */
addEventListener("message", async (ev) => {
    try {
        let response: any = undefined;

        switch (ev.data.id) {
            // Init helper.
            case "init": OffscreenAssets._Instance = new OffscreenAssets(ev.data.canvas); break;
            // Resets the helper by removing elements and disposing the scene.
            case "reset": OffscreenAssets._Instance.reset(); break;
            // Return a screeshot of the current canvas.
            case "getScreenshot": response = await OffscreenAssets._Instance.getScreenshot(); break;
            // Creates the given mesh.
            case "createMesh": OffscreenAssets._Instance.createMesh(ev.data.type); break;
            // Import a mesh
            case "importMesh": response = await OffscreenAssets._Instance.importMesh(ev.data.rootUrl, ev.data.filename); break;
            // Sets the given material to the mesh.
            case "setMaterial": OffscreenAssets._Instance.setMaterial(ev.data.json, ev.data.rootUrl); break;
            // Disposes the current material
            case "disposeMaterial": OffscreenAssets._Instance.disposeMaterial(); break;
        }

        postMessage({ id: ev.data.id, response }, undefined!);
    } catch (e) {
        postMessage({ id: ev.data.id, error: true }, undefined!);
    }
});
