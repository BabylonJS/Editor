import { extname, basename } from "path/posix";

import { ipcRenderer } from "electron";

import { toast } from "sonner";
import { Button, Divider } from "@blueprintjs/core";
import { Component, MouseEvent, ReactNode } from "react";

import { GiWireframeGlobe } from "react-icons/gi";

import { AbstractMesh, Animation, Camera, Color3, CubeTexture, CubicEase, EasingFunction, Engine, GizmoCoordinatesMode, ISceneLoaderAsyncResult, Scene, Vector2, Vector3, Viewport } from "babylonjs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/shadcn/ui/select";

import { Editor } from "../main";

import { isMesh } from "../../tools/guards/nodes";
import { Tween } from "../../tools/animation/tween";
import { waitNextAnimationFrame } from "../../tools/tools";

import { EditorCamera } from "../nodes/camera";

import { PositionIcon } from "../../ui/icons/position";
import { RotationIcon } from "../../ui/icons/rotation";
import { ScalingIcon } from "../../ui/icons/scaling";

import { SpinnerUIComponent } from "../../ui/spinner";

import { registerSimpleUndoRedo } from "../../tools/undoredo";

import { disposeSSRRenderingPipeline } from "../rendering/ssr";
import { disposeMotionBlurPostProcess } from "../rendering/motion-blur";
import { disposeSSAO2RenderingPipeline } from "../rendering/ssao";
import { disposeDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { EditorGraphContextMenu } from "./graph/graph";

import { EditorPreviewGizmo } from "./preview/gizmo";
import { EditorPreviewIcons } from "./preview/icons";
import { EditorPreviewConvertProgress } from "./preview/progress";
import { configureImportedTexture, loadImportedMaterial, loadImportedSceneFile, tryConvertSceneFile } from "./preview/import";

export interface IEditorPreviewProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorPreviewState {
    /**
     * Defines the information message drawn over the preview to tell
     * the user what is happening.
     */
    informationMessage: ReactNode;

    /**
     * Defines the active gizmo.
     */
    activeGizmo: "position" | "rotation" | "scaling" | "none";

    /**
     * Defines wether or not the preview is focused.
     */
    isFocused: boolean;
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
    private _mouseDownPosition: Vector2 = Vector2.Zero();

    private _meshUnderPointer: AbstractMesh | null;

    public constructor(props: IEditorPreviewProps) {
        super(props);

        this.state = {
            activeGizmo: "none",

            isFocused: false,
            informationMessage: "",
        };

        ipcRenderer.on("gizmo:position", () => this.setActiveGizmo("position"));
        ipcRenderer.on("gizmo:rotation", () => this.setActiveGizmo("rotation"));
        ipcRenderer.on("gizmo:scaling", () => this.setActiveGizmo("scaling"));

        document.addEventListener("copy", () => this.state.isFocused && this.props.editor.layout.graph.copySelectedNodes());
        document.addEventListener("paste", () => this.state.isFocused && this.props.editor.layout.graph.pasteSelectedNodes());

        ipcRenderer.on("preview:focus", () => this.state.isFocused && this.focusObject());
        ipcRenderer.on("preview:edit-camera", () => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera));
    }

    public render(): ReactNode {
        return (
            <div className="relative w-full h-full text-foreground">
                <div className="flex flex-col w-full h-full">
                    {this._getToolbar()}

                    <EditorGraphContextMenu editor={this.props.editor} object={this._meshUnderPointer}>
                        <canvas
                            ref={(r) => this._onGotCanvasRef(r!)}
                            onDrop={(ev) => this._handleDrop(ev)}
                            onDragOver={(ev) => {
                                ev.preventDefault();
                                this._handleMouseMove(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);
                            }}
                            onFocus={() => this.setState({ isFocused: true })}
                            onPointerUp={(ev) => this._handleMouseClick(ev)}
                            onPointerDown={(ev) => this._handleMouseDown(ev)}
                            onMouseLeave={() => this._handleMouseLeave()}
                            onMouseMove={() => this._handleMouseMove(this.scene.pointerX, this.scene.pointerY)}
                            className="w-full h-full select-none outline-none"
                        />
                    </EditorGraphContextMenu>
                </div>

                <EditorPreviewIcons ref={(r) => this._onGotIconsRef(r!)} editor={this.props.editor} />

                <div
                    style={{
                        opacity: this.state.informationMessage ? "1" : "0",
                        top: this.state.informationMessage ? "45px" : "-50px",
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

    /**
     * Resets the preview component by re-creating the engine and an empty scene.
     */
    public reset(): void {
        const canvas = this.engine?.getRenderingCanvas();
        if (!canvas) {
            return;
        }

        this.icons?.stop();

        this.scene?.dispose();
        this.engine?.dispose();

        disposeSSRRenderingPipeline();
        disposeMotionBlurPostProcess();
        disposeSSAO2RenderingPipeline();
        disposeDefaultRenderingPipeline();

        this.scene = null!;
        this.engine = null!;

        this._onGotCanvasRef(canvas);
    }

    /**
     * Tries to focused the given object or the first one selected in the graph.
     */
    public focusObject(object?: any): void {
        const selectedNode = object ?? this.props.editor.layout.graph.getSelectedNodes()[0];
        if (!selectedNode) {
            return;
        }

        const position = selectedNode.getAbsolutePosition?.();
        const camera = this.scene.activeCamera;
        if (position && camera) {
            Tween.Create(camera, 0.5, {
                "target": position,
            });
        }
    }

    /**
     * Sets the given camera active as a preview.
     * This helps to visualize what the selected camera sees when being manipulated
     * using gizmos for example.
     * When "null", the preview is removed.
     * @param camera the camera to activate the preview
     */
    public setCameraPreviewActive(camera: Camera | null): void {
        if (!camera) {
            this.scene.activeCameras?.forEach((camera) => {
                camera.viewport = new Viewport(0, 0, 1, 1);
            });
            this.scene.activeCameras = null;
        } else {
            this.scene.activeCameras = [this.camera, camera];

            camera.viewport = new Viewport(0, 0, 0.5, 0.5);
            this.camera.viewport = new Viewport(0, 0, 1, 1);
        }

        this.scene.activeCamera = this.camera;
        this.scene.cameraToUseForPointers = this.camera;
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

        Animation.AllowMatricesInterpolation = true;
        Animation.AllowMatrixDecomposeForInterpolation = true;

        this.engine = new Engine(canvas, true, {
            antialias: true,
            audioEngine: true,
            adaptToDeviceRatio: true,
            disableWebGL2Support: false,
            useHighPrecisionFloats: true,
            useHighPrecisionMatrix: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
        });

        this.scene = new Scene(this.engine);
        this.scene.autoClear = true;

        this.camera = new EditorCamera("camera", Vector3.Zero(), this.scene);
        this.camera.attachControl(true);

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

        this.icons?.run();
        this.forceUpdate();
    }

    private _handleMouseLeave(): void {
        this._restoreCurrentMeshUnderPointer();
        this._meshUnderPointer = null;

        this.setState({ isFocused: false });
    }

    private _mouseMoveTimeoutId: number = -1;

    private _handleMouseMove(x: number, y: number): void {
        const pick = this.scene.pick(x, y, (m) => !m._masterMesh, false);
        const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

        if (mesh && this._meshUnderPointer !== mesh) {
            this._restoreCurrentMeshUnderPointer();
            this._highlightCurrentMeshUnderPointer(mesh);

            this._meshUnderPointer = mesh;

            if (this._mouseMoveTimeoutId) {
                clearTimeout(this._mouseMoveTimeoutId);
            }

            this._mouseMoveTimeoutId = window.setTimeout(() => {
                this.forceUpdate();
            }, 200);
        }
    }

    private _handleMouseDown(event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
        this._mouseDownPosition.set(event.clientX, event.clientY);

        this._restoreCurrentMeshUnderPointer();
        this._meshUnderPointer = null;
    }

    private _handleMouseClick(event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
        const distance = Vector2.Distance(
            this._mouseDownPosition,
            new Vector2(event.clientX, event.clientY),
        );

        if (distance > 2) {
            return;
        }

        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => !m._masterMesh);
        const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

        if (mesh) {
            // this.setCameraPreviewActive(null);

            this.gizmo.setAttachedNode(mesh);
            this.props.editor.layout.graph.setSelectedNode(mesh);
            this.props.editor.layout.inspector.setEditedObject(mesh);
        }
    }

    private _highlightCurrentMeshUnderPointer(pickedMesh: AbstractMesh): void {
        Tween.KillTweensOf(pickedMesh);

        const meshes = [pickedMesh];

        if (isMesh(pickedMesh)) {
            pickedMesh.getLODLevels().forEach((lod) => {
                if (lod.mesh) {
                    meshes.push(lod.mesh);
                }
            });
        }

        meshes.forEach((mesh) => {
            Tween.Create(mesh, 0.1, {
                "overlayAlpha": 0.5,
                "overlayColor": Color3.Black(),
                onStart: () => mesh!.renderOverlay = true,
            });
        });
    }

    private _restoreCurrentMeshUnderPointer(): void {
        const mesh = this._meshUnderPointer;

        if (mesh) {
            const meshes = [mesh];

            if (isMesh(mesh)) {
                mesh.getLODLevels().forEach((lod) => {
                    if (lod.mesh) {
                        meshes.push(lod.mesh);
                    }
                });
            }

            meshes.forEach((mesh) => {
                Tween.KillTweensOf(mesh);

                mesh.overlayAlpha ??= 0;
                mesh.overlayColor ??= Color3.Black();

                Tween.Create(mesh, 0.1, {
                    "overlayAlpha": 0,
                    "overlayColor": Color3.Black(),
                    onStart: () => mesh.renderOverlay = true,
                });
            });
        }
    }

    private _getToolbar(): ReactNode {
        return (
            <div className="absolute top-0 left-0 w-full h-12 z-10">
                <div className="flex justify-between h-full bg-background/95 w-full p-1">
                    <div className="flex gap-2 items-center h-10">
                        <Select
                            value={this.scene?.activeCamera?.id}
                            onValueChange={(v) => {
                                const camera = this.scene.cameras.find((c) => c.id === v) ?? null;
                                this.scene.activeCamera?.detachControl();

                                this.scene.activeCamera = camera;
                                this.scene.activeCamera?.attachControl(true);
                            }}
                        >
                            <SelectTrigger className="w-32 border-none">
                                <SelectValue placeholder="Select Value..." />
                            </SelectTrigger>
                            <SelectContent>
                                {this.scene?.cameras.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Divider />

                        <Button active={this.state.activeGizmo === "position"} onClick={() => this.setActiveGizmo("position")} minimal icon={<PositionIcon width={16} />} className="w-10 h-10 transition-all duration-300" />
                        <Button active={this.state.activeGizmo === "rotation"} onClick={() => this.setActiveGizmo("rotation")} minimal icon={<RotationIcon width={16} />} className="w-10 h-10 transition-all duration-300" />
                        <Button active={this.state.activeGizmo === "scaling"} onClick={() => this.setActiveGizmo("scaling")} minimal icon={<ScalingIcon height={16} />} className="w-10 h-10 transition-all duration-300" />

                        <Select
                            value={this.gizmo?.getCoordinateMode().toString()}
                            onValueChange={(v) => {
                                this.gizmo?.setCoordinatesMode(parseInt(v));
                                this.forceUpdate();
                            }}
                        >
                            <SelectTrigger className="w-32 border-none">
                                <SelectValue placeholder="Select Value..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={GizmoCoordinatesMode.World.toString()}>World</SelectItem>
                                <SelectItem value={GizmoCoordinatesMode.Local.toString()}>Local</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button active={this.scene?.forceWireframe} minimal icon={<GiWireframeGlobe className="w-6 h-6" strokeWidth={1} color="white" />} className="w-10 h-10 transition-all duration-300" onClick={() => {
                            this.scene.forceWireframe = !this.scene.forceWireframe;
                            this.forceUpdate();
                        }} />
                    </div>
                </div>
            </div>
        );
    }

    public setActiveGizmo(gizmo: "position" | "rotation" | "scaling" | "none"): void {
        if (this.state.activeGizmo === gizmo) {
            gizmo = "none";
        }

        this.gizmo.setGizmoType(gizmo);
        this.setState({ activeGizmo: gizmo });
    }

    public async importSceneFile(absolutePath: string, useCloudConverter: boolean): Promise<ISceneLoaderAsyncResult | null> {
        if (useCloudConverter) {
            const extension = extname(absolutePath).toLowerCase();
            switch (extension) {
                case ".fbx":
                case ".blend":
                    let progressRef: EditorPreviewConvertProgress;
                    this.setState({
                        informationMessage: (
                            <EditorPreviewConvertProgress absolutePath={absolutePath} ref={(r) => progressRef = r!} />
                        ),
                    });

                    absolutePath = await tryConvertSceneFile(absolutePath, (value) => progressRef?.setState({ value }));

                    if (!absolutePath) {
                        toast.error("Failed to convert the file.");
                        this.setState({ informationMessage: null });
                        return null;
                    }
                    break;
            }
        }

        this.setState({ informationMessage: `Importing scene "${basename(absolutePath)}"...` });
        const result = await loadImportedSceneFile(this.scene, absolutePath, useCloudConverter);
        this.setState({ informationMessage: "" });

        return result;
    }

    private async _handleDrop(ev: React.DragEvent<HTMLCanvasElement>): Promise<void> {
        const absolutePaths = this.props.editor.layout.assets.state.selectedKeys;

        absolutePaths.forEach(async (absolutePath) => {
            await waitNextAnimationFrame();
            const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh, false);
            const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

            const extension = extname(absolutePath).toLowerCase();
            switch (extension) {
                case ".x":
                case ".b3d":
                case ".dae":
                case ".glb":
                case ".gltf":
                case ".fbx":
                case ".stl":
                case ".lwo":
                case ".dxf":
                case ".obj":
                case ".3ds":
                case ".ms3d":
                case ".blend":
                case ".babylon":
                    this.importSceneFile(absolutePath, true);
                    break;

                case ".env":
                    const newTexture = configureImportedTexture(CubeTexture.CreateFromPrefilteredData(
                        absolutePath,
                        this.props.editor.layout.preview.scene,
                    ));

                    registerSimpleUndoRedo({
                        object: this.scene,
                        property: "environmentTexture",
                        oldValue: this.props.editor.layout.preview.scene.environmentTexture,
                        newValue: newTexture,
                        executeRedo: true,
                        onLost: () => newTexture.dispose(),
                    });
                    break;

                case ".material":
                    loadImportedMaterial(this.props.editor.layout.preview.scene, absolutePath).then((material) => {
                        if (material && mesh) {
                            registerSimpleUndoRedo({
                                object: mesh,
                                property: "material",
                                oldValue: mesh?.material,
                                newValue: material,
                                executeRedo: true,
                                onLost: () => {
                                    const bindedMeshes = material.getBindedMeshes();
                                    if (!bindedMeshes.length) {
                                        material.dispose();
                                    }
                                },
                            });
                        }
                    });
                    break;
            }
        });
    }
}
