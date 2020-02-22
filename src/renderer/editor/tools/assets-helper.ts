import { Engine, Scene, TargetCamera, Vector3, Color4, HemisphericLight } from "babylonjs";

export class AssetsHelper {
    /**
     * The canvas used to render elements.
     */
    public canvas: HTMLCanvasElement;
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

        // Babylon.JS stuffs
        this.engine = new Engine(this.canvas);
        this.reset();
    }

    /**
     * Resets the assets helper.
     */
    public reset(): void {
        if (this.scene) { this.scene.dispose(); }

        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        this.scene.defaultMaterial.backFaceCulling = false;

        this.camera = new TargetCamera("AssetsHelperCamera", new Vector3(0, 0, 0), this.scene, true);
        this.camera.minZ = 0.1;
        
        this.light = new HemisphericLight("AssetsHelperLight", new Vector3(0, 1, 0), this.scene);
    }

    /**
     * Returns a screenshot of the scene once the scene is ready.
     * Returns a screenshot as a base64 string.
     */
    public async getScreenshot(): Promise<string> {
        return new Promise<string>((resolve) => {
            this.scene.onReadyObservable.addOnce(() => {
                const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
                const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

                this.scene.meshes.forEach(d => {
                    const b = d._boundingInfo;
                    if (!b) { return; }
                    maximum.x = Math.max(b.maximum.x, maximum.x);
                    maximum.y = Math.max(b.maximum.y, maximum.y);
                    maximum.z = Math.max(b.maximum.z, maximum.z);

                    minimum.x = Math.min(b.minimum.x, minimum.x);
                    minimum.y = Math.min(b.minimum.y, minimum.y);
                    minimum.z = Math.min(b.minimum.z, minimum.z);
                });

                const center = Vector3.Center(minimum, maximum);
                const distance = Vector3.Distance(minimum, maximum) * 0.5;

                this.camera.position = center.add(new Vector3(distance, distance, distance));
                this.camera.setTarget(center);

                this.scene.render();

                resolve(this.engine.getRenderingCanvas()?.toDataURL("image/png"));
            });

            this.scene._checkIsReady();
        });
    }
}

/**
 * Export a default instance.
 */
export const assetsHelper = new AssetsHelper;
