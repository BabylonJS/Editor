import { ipcRenderer } from "electron";

import { IPCRequests } from "../../../shared/ipc";

import { Engine, Scene, ArcRotateCamera, Vector3, SceneLoader, PointLight, Mesh, Texture, PBRMaterial, CubeTexture, Color3 } from "babylonjs";
import { GridMaterial } from "babylonjs-materials";
import "babylonjs-loaders";

import * as React from "react";

export const title = "Mesh Viewer";

export default class MeshViewerWindow extends React.Component {
    private _engine: Engine;
    private _scene: Scene;
    private _camera: ArcRotateCamera;

    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);

        this._bindEvents();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <canvas id="renderCanvas" style={{ width: "100%", height: "100%", position: "absolute", top: "0", touchAction: "none" }}></canvas>;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        if (!canvas) { return; }

        this._engine = new Engine(canvas, true, {
            audioEngine: true,
        });
        this._scene = new Scene(this._engine);
        
        this._camera = new ArcRotateCamera("camera", 0, 0, 100, Vector3.Zero(), this._scene, true);
        this._camera.minZ = 0.1;
        this._camera.attachControl(canvas, false, false);

        this._engine.runRenderLoop(() => this._scene.render());

        // Add events
        window.addEventListener("resize", () => this._engine.resize());
    }

    /**
     * Binds the ipc events.
     */
    private _bindEvents(): void {
        ipcRenderer.on(IPCRequests.SendWindowMessage, (_ , data) => data.id === "init" && this._loadMesh(data.rootUrl, data.name));
    }

    /**
     * Loads the mesh located at the given path.
     */
    private async _loadMesh(rootUrl: string, name: string): Promise<void> {
        // Load mesh
        await SceneLoader.AppendAsync(rootUrl, name, this._scene);

        // Place camera
        this._scene.onReadyObservable.addOnce(() => {
            const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
            const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

            this._scene.meshes.forEach(d => {
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

            this._camera.position = center.add(new Vector3(distance, distance, distance));
            this._camera.setTarget(center);

            if (!this._scene.lights.length) {
                new PointLight("light", this._camera.position.clone(), this._scene);
            }

            // Create skybox
            this._createEnvironment(minimum, distance * 10);

            // Open bjs inspector
            this._scene.debugLayer.show({
                globalRoot: document.body,
                handleResize: false,
                enablePopup: false,
                enableClose: false,
                embedMode: true,
                inspectorURL: "../node_modules/babylonjs-inspector/babylon.inspector.bundle.max.js",
            });
        });

        this._scene._checkIsReady();
    }

    /**
     * Creates the environment.
     */
    private _createEnvironment(minimum: Vector3, distance: number): void {
        // Configure camera
        this._camera.maxZ = distance * 10;
        
        // Environment texture
        const texture = CubeTexture.CreateFromPrefilteredData("../assets/textures/forest.env", this._scene);
        this._scene.environmentTexture = texture;

        const materialTexture = texture.clone();
        materialTexture.coordinatesMode = Texture.SKYBOX_MODE;

        // Create material
        const material = new PBRMaterial("material", this._scene);
        material.reflectionTexture = materialTexture;

        // Create skybox
        const skybox = Mesh.CreateBox("skybox", distance * 10, this._scene, false, Mesh.BACKSIDE);
        skybox.infiniteDistance = true;
        skybox.material = material;

        // Create grid material
        const gridMaterial = new GridMaterial("grid", this._scene);
        gridMaterial.majorUnitFrequency = 10;
        gridMaterial.minorUnitVisibility = 0.3;
        gridMaterial.gridRatio = 0.01;
        gridMaterial.backFaceCulling = false;
        gridMaterial.mainColor = new Color3(1, 1, 1);
        gridMaterial.lineColor = new Color3(1, 1, 1);
        gridMaterial.opacity = 0.8;
        gridMaterial.zOffset = 1;
        gridMaterial.opacityTexture = new Texture("../assets/textures/grid_background.png", this._scene);

        // Create grid
        const grid = Mesh.CreateGround("grid", distance, distance, 2, this._scene);
        grid.position.set(0, minimum.y, 0);
        grid.material = gridMaterial;
    }
}
