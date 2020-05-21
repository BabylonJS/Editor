import { basename, extname } from "path";

import * as React from "react";

import { Engine, Scene, ArcRotateCamera, Vector3, PBRMaterial, CubeTexture, Mesh } from "babylonjs";

export interface ITextureViewerState {
    /**
     * Defines the path of the texture.
     */
    path: string;
    /**
     * Defines wether or not the texture is a cube texture.
     */
    isCube: boolean;
}

export const title = "Texture Viewer";

export default class TextureViewerWindow extends React.Component<{ }, ITextureViewerState> {
    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);
        this.state = { path: "../css/svg/magic.svg", isCube: false };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        document.title = basename(this.state.path);

        const span = <span style={{ color: "black" }}>{this.state.path}</span>;
        if (this.state.isCube) {
            return (
                <>
                    {span}
                    <canvas id="renderCanvas" style={{ width: "100%", height: "calc(100% - 18px)", top: "0", touchAction: "none" }}></canvas>
                </>
            );
        }

        return (
            <>
                {span}
                <img src={this.state.path} style={{ width: "100%", height: "100%", objectFit: "contain", background: "black" }}></img>
            </>
        );
    }

    /**
     * Inits the plugin
     * @param path defines the path to the texture file.
     */
    public init(path: string): void {
        const extension = extname(path).toLowerCase();
        const isCube = extension === ".dds" || extension === ".env";

        this.setState({ path: path, isCube });
    }

    /**
     * Called on the component did update.
     */
    public async componentDidUpdate(): Promise<void> {
        if (!this.state.isCube) { return; }

        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        const engine = new Engine(canvas, true);

        const scene = new Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);

        const camera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene, true);
        camera.attachControl(canvas, false, false);

        const material = new PBRMaterial("material", scene);
        material.reflectionTexture = CubeTexture.CreateFromPrefilteredData(this.state.path, scene);

        const sphere = Mesh.CreateSphere("sphere", 32, 7, scene, false);
        sphere.material = material;

        window.addEventListener("resize", () => engine.resize());
        engine.runRenderLoop(() => scene.render());

        // Open bjs inspector
        await scene.debugLayer.show({
            globalRoot: document.body,
            handleResize: false,
            enablePopup: false,
            enableClose: false,
            embedMode: true,
            inspectorURL: "../node_modules/babylonjs-inspector/babylon.inspector.bundle.max.js",
        });
        scene.debugLayer.select(material.reflectionTexture);
    }
}
