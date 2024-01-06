import { extname, basename } from "path/posix";

import { ipcRenderer } from "electron";

import { Component, ReactNode } from "react";
import { Button, Divider } from "@blueprintjs/core";

import { AbstractMesh, Color3, CubeTexture, CubicEase, EasingFunction, Engine, GizmoCoordinatesMode, PointerEventTypes, Scene, Vector3 } from "babylonjs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/shadcn/ui/select";

import { Editor } from "../main";

import { Tween } from "../../tools/animation/tween";
import { waitNextAnimationFrame } from "../../tools/tools";

import { EditorCamera } from "../nodes/camera";

import { PositionIcon } from "../../ui/icons/position";
import { RotationIcon } from "../../ui/icons/rotation";
import { ScalingIcon } from "../../ui/icons/scaling";

import { SpinnerUIComponent } from "../../ui/spinner";

import { EditorGraphContextMenu } from "./graph/graph";

import { EditorPreviewGizmo } from "./preview/gizmo";
import { EditorPreviewIcons } from "./preview/icons";
import { configureImportedTexture, loadImportedSceneFile } from "./preview/import";

export interface IEditorPreviewProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorPreviewState {
    /**
     * Defines the active gizmo.
     */
    activeGizmo: "position" | "rotation" | "scaling" | "none";

    meshUnderPointer: any;
    informationMessage: string;
}

export class EditorPreview extends Component<IEditorPreviewProps, IEditorPreviewState> {
    /**
     * The engine of the preview.
     */
    public engine: Engine;
    /**
     * The scene of the preview.
     */
    public scene: Scene;
    /**
     * The camera of the preview.
     */
    public camera: EditorCamera;

    /**
     * The gizmo manager of the preview
     */
    public gizmo: EditorPreviewGizmo;
    /**
     * The icons manager of the preview.
     */
    public icons: EditorPreviewIcons;

    private _renderScene: boolean = true;

    public constructor(props: IEditorPreviewProps) {
        super(props);

        this.state = {
            activeGizmo: "none",

            meshUnderPointer: null,
            informationMessage: "",
        };

        ipcRenderer.on("gizmo:position", () => this.setActiveGizmo("position"));
        ipcRenderer.on("gizmo:rotation", () => this.setActiveGizmo("rotation"));
        ipcRenderer.on("gizmo:scaling", () => this.setActiveGizmo("scaling"));
    }

    public render(): ReactNode {
        return (
            <div className="relative flex flex-col w-full h-full">
                {this._getToolbar()}

                <EditorGraphContextMenu editor={this.props.editor} object={this.state.meshUnderPointer}>
                    <canvas
                        ref={(r) => this._onGotCanvasRef(r!)}
                        onDrop={(ev) => this._handleDrop(ev)}
                        onDragOver={(ev) => ev.preventDefault()}
                        onClick={() => this._handleMouseClick()}
                        onMouseMove={() => this._handleMouseMove()}
                        onMouseLeave={() => this._handleMouseLeave()}
                        className="w-full h-full select-none outline-none transition-all duration-300"
                    />
                </EditorGraphContextMenu>

                <EditorPreviewIcons ref={(r) => this._onGotIconsRef(r!)} editor={this.props.editor} />

                <div
                    style={{
                        opacity: this.state.informationMessage ? "1" : "0",
                        top: this.state.informationMessage ? "30px" : "-50px",
                    }}
                    className="absolute left-0 flex gap-2 items-center px-2 h-10 bg-black/50 transition-all duration-300 pointer-events-none"
                >
                    <SpinnerUIComponent width="16" />
                    <div>{this.state.informationMessage}</div>
                </div>
            </div>
        );
    }

    /**
     * Sets whether or not to render the scene.
     * @param render defines whether or not to render the scene.
     */
    public setRenderScene(render: boolean): void {
        this._renderScene = render;
    }

    private _onGotIconsRef(ref: EditorPreviewIcons): void {
        if (this.icons) {
            return;
        }

        waitNextAnimationFrame().then(() => {
            this.icons = ref;
            this.icons?.run();
        });
    }

    private _onGotCanvasRef(canvas: HTMLCanvasElement): void {
        if (this.engine) {
            return;
        }

        this.engine = new Engine(canvas, true, {
            stencil: true,
            antialias: true,
            audioEngine: true,
            disableWebGL2Support: false,
            powerPreference: "high-performance",
            premultipliedAlpha: false,
            failIfMajorPerformanceCaveat: false,
            useHighPrecisionFloats: true,
            adaptToDeviceRatio: true,
            preserveDrawingBuffer: true,
        });

        this.scene = new Scene(this.engine);

        this.camera = new EditorCamera("camera", Vector3.Zero(), this.scene);
        this.camera.attachControl(true);

        // require("babylonjs").SceneLoader.AppendAsync("scenes/", "scene.babylon", this.scene).then(() => {
        //     this.scene.activeCamera = this.camera;
        //     this.props.editor.layout.inspector.setEditedObject(this.scene.meshes[0]);
        // });
        this.gizmo = new EditorPreviewGizmo(this.scene);

        this.engine.hideLoadingUI();

        this.engine.runRenderLoop(() => {
            if (this._renderScene) {
                this.scene.render();
            }
        });

        Tween.Scene = this.scene;
        Tween.DefaultEasing = {
            type: new CubicEase(),
            mode: EasingFunction.EASINGMODE_EASEINOUT,
        };

        this.forceUpdate();
    }

    private _handleMouseLeave(): void {
        this._restoreCurrentMeshUnderPointer();
        this.setState({ meshUnderPointer: null });
    }

    private _handleMouseMove(): void {
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

        if (pick.pickedMesh && this.state.meshUnderPointer !== pick.pickedMesh) {
            this._restoreCurrentMeshUnderPointer();
            this._highlightCurrentMeshUnderPointer(pick.pickedMesh);
            this.setState({ meshUnderPointer: pick.pickedMesh });
        }
    }

    private _handleMouseClick(): void {
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

        if (pick.pickedMesh) {
            this.gizmo.setAttachedNode(pick.pickedMesh);
            this.props.editor.layout.graph.setSelectedNode(pick.pickedMesh);
            this.props.editor.layout.inspector.setEditedObject(pick.pickedMesh);
        }
    }

    private _highlightCurrentMeshUnderPointer(pickedMesh: AbstractMesh): void {
        Tween.KillTweensOf(pickedMesh);

        Tween.Create(pickedMesh, 0.1, {
            "overlayAlpha": 0.15,
            "overlayColor": Color3.Black(),
            onStart: () => pickedMesh!.renderOverlay = true,
        });
    }

    private _restoreCurrentMeshUnderPointer(): void {
        const mesh = this.state.meshUnderPointer;

        if (mesh) {
            Tween.KillTweensOf(mesh);

            mesh.overlayAlpha ??= 0;
            mesh.overlayColor ??= Color3.Black();

            Tween.Create(mesh, 0.1, {
                "overlayAlpha": 0,
                "overlayColor": Color3.Black(),
                onStart: () => mesh.renderOverlay = true,
            });
        }
    }

    private _getToolbar(): ReactNode {
        return (
            <div className="flex justify-between h-10 bg-[#222222] w-full">
                <div className="flex gap-2 items-center h-full">
                    <Select
                        value={this.scene?.activeCamera?.id}
                        onValueChange={(v) => {
                            const camera = this.scene.cameras.find((c) => c.id === v) ?? null;
                            this.scene.activeCamera?.detachControl();

                            this.scene.activeCamera = camera;
                            this.scene.activeCamera?.attachControl(true);
                        }}
                    >
                        <SelectTrigger className="w-32 bg-black/20 text-white/75 border-none">
                            <SelectValue placeholder="Select Value..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#222222] text-white/75">
                            {this.scene?.cameras.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Divider />

                    <Button active={this.state.activeGizmo === "position"} onClick={() => this.setActiveGizmo("position")} minimal icon={<PositionIcon width={16} color="white" />} className="w-10 h-10 transition-all duration-300" />
                    <Button active={this.state.activeGizmo === "rotation"} onClick={() => this.setActiveGizmo("rotation")} minimal icon={<RotationIcon width={16} color="white" />} className="w-10 h-10 transition-all duration-300" />
                    <Button active={this.state.activeGizmo === "scaling"} onClick={() => this.setActiveGizmo("scaling")} minimal icon={<ScalingIcon height={16} color="white" />} className="w-10 h-10 transition-all duration-300" />

                    <Select
                        value={this.gizmo?.getCoordinateMode().toString()}
                        onValueChange={(v) => {
                            this.gizmo?.setCoordinatesMode(parseInt(v));
                            this.forceUpdate();
                        }}
                    >
                        <SelectTrigger className="w-32 bg-black/20 text-white/75 border-none">
                            <SelectValue placeholder="Select Value..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#222222] text-white/75">
                            <SelectItem value={GizmoCoordinatesMode.World.toString()}>World</SelectItem>
                            <SelectItem value={GizmoCoordinatesMode.Local.toString()}>Local</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    public setActiveGizmo(gizmo: "position" | "rotation" | "scaling" | "none"): void {
        this.gizmo.setGizmoType(gizmo);
        this.setState({ activeGizmo: gizmo });
    }

    private _handleDrop(ev: React.DragEvent<HTMLCanvasElement>): void {
        const absolutePath = ev.dataTransfer.getData("asset");
        if (typeof (absolutePath) !== "string") {
            return;
        }

        const extension = extname(absolutePath).toLowerCase();
        switch (extension) {
            case ".glb":
            case ".gltf":
            case ".fbx":
            case ".babylon":
            case ".obj":
            case ".3ds":
            case ".blend":
                this.setState({ informationMessage: `Importing scene "${basename(absolutePath)}"...` });
                loadImportedSceneFile(this.props.editor.layout.preview.scene, absolutePath).then(() => {
                    this.setState({ informationMessage: "" });
                });
                break;

            case ".env":
                this.props.editor.layout.preview.scene.environmentTexture?.dispose();
                this.props.editor.layout.preview.scene.environmentTexture = configureImportedTexture(CubeTexture.CreateFromPrefilteredData(
                    absolutePath,
                    this.props.editor.layout.preview.scene,
                ));
                break;
        }
    }
}
