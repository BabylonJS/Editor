import { Undefinable, Nullable } from "../../../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Dialog, Classes, Button, Intent, AnchorButton, H5, FileInput } from "@blueprintjs/core";

import { CubeTexture, Engine, Scene, Mesh, StandardMaterial, Texture, ArcRotateCamera, Vector3, Color3 } from "babylonjs";

import { Tools } from "../../tools/tools";

import { Editor } from "../../editor";
import { join } from "path";

export interface IPureCubeDialogProps {
    /**
     * Defines the container of the element.
     */
    container: HTMLDivElement;
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the callback called on the dialog has been closed.
     */
    onClosed: (texture?: CubeTexture) => void;
}

export interface IPureCubeDialogState {
    positiveX?: string;
    positiveY?: string;
    positiveZ?: string;

    negativeX?: string;
    negativeY?: string;
    negativeZ?: string;
}

export class PureCubeDialog extends React.Component<IPureCubeDialogProps, IPureCubeDialogState> {
    /**
     * Shows the pure cube texture creation dialog.
     * @param editor defines the reference to the editor.
     */
    public static async Show(editor: Editor): Promise<Undefinable<CubeTexture>> {
        const c = document.createElement("div");
        c.style.position = "absolute";
        c.style.pointerEvents = "none";
        document.body.appendChild(c);

        return new Promise<Undefinable<CubeTexture>>((resolve) => {
            ReactDOM.render(<PureCubeDialog container={c} editor={editor} onClosed={(t) => resolve(t)} />, c);
        });
    }

    public static DefaultImage: string= join(Tools.GetAppPath(), "assets/extras/waitlogo.png");

    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _engine: Nullable<Engine> = null;
    private _scene: Nullable<Scene> = null;
    private _camera: Nullable<ArcRotateCamera> = null;
    private _cube: Nullable<Mesh> = null;
    private _material: Nullable<StandardMaterial> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IPureCubeDialogProps) {
        super(props);
        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Dialog
                icon="add"
                title="Add Pure Cube Texture"
                className={Classes.DARK}
                isOpen={true}
                autoFocus={true}
                enforceFocus={true}
                usePortal={true}
                style={{ width: "1000px" }}
            >
                <div className={Classes.DIALOG_BODY} style={{ width: "1000px", height: "500px" }}>
                    <div style={{ float: "left", width: "350px", height: "100%" }}>
                        <H5>Textures</H5>
                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("positiveX", e)} text={this.state.positiveX ?? "Positive X"} buttonText={"Choose..."} title={"Positive X"} />
                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("positiveY", e)} text={this.state.positiveY ?? "Positive Y"} buttonText={"Choose..."} title={"Positive Y"} />
                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("positiveZ", e)} text={this.state.positiveZ ?? "Positive Z"} buttonText={"Choose..."} title={"Positive Z"} />

                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("negativeX", e)} text={this.state.negativeX ?? "Positive X"} buttonText={"Choose..."} title={"Negative X"} />
                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("negativeY", e)} text={this.state.negativeY ?? "Negative Y"} buttonText={"Choose..."} title={"Negative Y"} />
                        <FileInput fill={true} onInputChange={(e) => this._handleSelectedFile("negativeZ", e)} text={this.state.negativeZ ?? "Negative Z"} buttonText={"Choose..."} title={"Negative Z"} />
                    </div>

                    <canvas ref={(ref) => this._canvas = ref} style={{ marginLeft: "20px", width: "600px", height: "100%" }}></canvas>
                </div>

                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={() => this._handleClose()}>Close</Button>
                        <AnchorButton intent={Intent.PRIMARY} onClick={() => this._handleCreate()}>Create</AnchorButton>
                    </div>
                </div>
            </Dialog>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        await Tools.Wait(100);

        if (!this._canvas) { return; }

        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        this._camera = new ArcRotateCamera("camera", 0, 0, 1, Vector3.Zero(), this._scene, true);
        this._camera.maxZ = 1000;
        this._camera.attachControl(this._canvas);

        this._material = new StandardMaterial("CubeMaterial", this._scene);
        this._material.disableLighting = true;
        this._material.backFaceCulling = false;
        this._material.reflectionTexture = new CubeTexture("", this._scene, null, false, [
            PureCubeDialog.DefaultImage, PureCubeDialog.DefaultImage, PureCubeDialog.DefaultImage,
            PureCubeDialog.DefaultImage, PureCubeDialog.DefaultImage, PureCubeDialog.DefaultImage,
        ]);
        this._material.diffuseColor = new Color3(0, 0, 0);
        this._material.specularColor = new Color3(0, 0, 0);
        this._material.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;

        this._cube = Mesh.CreateBox("Box", 100, this._scene, false, Mesh.BACKSIDE);
        this._cube.material = this._material;

        this._engine.runRenderLoop(() => this._scene!.render());
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this._cube?.dispose();
        this._material?.dispose();

        this._scene?.dispose();
        this._engine?.dispose();
    }

    /**
     * Called on the user selected a file.
     */
    private _handleSelectedFile(id: keyof IPureCubeDialogState, e: React.FormEvent<HTMLInputElement>): void {
        const files = (e.target as HTMLInputElement).files;

        if (!files) { return; }
        if (!files?.length) { return; }

        this.setState({ [id]: files.item(0)?.path }, () => {
            // Update preview
            if (this._scene && this._material) {
                const files = [
                    this.state.negativeX ?? PureCubeDialog.DefaultImage, this.state.negativeY ?? PureCubeDialog.DefaultImage, this.state.negativeZ ?? PureCubeDialog.DefaultImage,
                    this.state.positiveX ?? PureCubeDialog.DefaultImage, this.state.positiveY ?? PureCubeDialog.DefaultImage, this.state.positiveZ ?? PureCubeDialog.DefaultImage,
                ];

                this._material.reflectionTexture?.dispose();
                this._material.reflectionTexture = new CubeTexture("", this._scene!, null, false, files);
                this._material.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
            }
        });
    }

    /**
     * Called on the user wants to crete the pure cube texture.
     */
    private _handleCreate(): void {
        const images = [
            this.state.negativeX!, this.state.negativeY!, this.state.negativeZ!,
            this.state.positiveX!, this.state.positiveY!, this.state.positiveZ!,
        ];
        if (images.indexOf(undefined!) !== -1) {
            return;
        }

        const texture = CubeTexture.CreateFromImages(images, this.props.editor.scene!);
        texture.name = "Pure Cube Texture";
        texture.url = "Pure Cube Texture";

        texture.onLoadObservable.addOnce(() => {
            this._handleClose(texture);
        });
    }

    /**
     * Called on the user closes the dialog.
     */
    private _handleClose(texture?: CubeTexture): void {
        ReactDOM.unmountComponentAtNode(this.props.container);
        this.props.container.remove();
        this.props.onClosed(texture);
    }
}
