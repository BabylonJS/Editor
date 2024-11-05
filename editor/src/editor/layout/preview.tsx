import { ipcRenderer } from "electron";
import { extname, basename, join } from "path/posix";

import { toast } from "sonner";
import { Button } from "@blueprintjs/core";
import { Component, MouseEvent, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { FaCheck } from "react-icons/fa6";
import { IoIosOptions } from "react-icons/io";
import { GiWireframeGlobe } from "react-icons/gi";

import {
    AbstractEngine, AbstractMesh, Animation, Camera, Color3, CubicEase, EasingFunction, Engine, GizmoCoordinatesMode,
    ISceneLoaderAsyncResult, ISize, Node, Scene, Vector2, Vector3, Viewport, WebGPUEngine,
} from "babylonjs";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/shadcn/ui/select";

import { Editor } from "../main";

import { Tween } from "../../tools/animation/tween";
import { registerUndoRedo } from "../../tools/undoredo";
import { waitNextAnimationFrame } from "../../tools/tools";
import { createSceneLink, getRootSceneLink } from "../../tools/scene/scene-link";
import { isAbstractMesh, isCollisionInstancedMesh, isCollisionMesh, isInstancedMesh, isMesh, isTransformNode } from "../../tools/guards/nodes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";

import { EditorCamera } from "../nodes/camera";

import { PositionIcon } from "../../ui/icons/position";
import { RotationIcon } from "../../ui/icons/rotation";
import { ScalingIcon } from "../../ui/icons/scaling";

import { SpinnerUIComponent } from "../../ui/spinner";
import { Separator } from "../../ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/shadcn/ui/tooltip";

import { disposeSSRRenderingPipeline, parseSSRRenderingPipeline, serializeSSRRenderingPipeline } from "../rendering/ssr";
import { disposeMotionBlurPostProcess, parseMotionBlurPostProcess, serializeMotionBlurPostProcess } from "../rendering/motion-blur";
import { disposeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, serializeSSAO2RenderingPipeline } from "../rendering/ssao";
import { disposeDefaultRenderingPipeline, parseDefaultRenderingPipeline, serializeDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { EditorGraphContextMenu } from "./graph/graph";

import { EditorPreviewGizmo } from "./preview/gizmo";
import { EditorPreviewIcons } from "./preview/icons";
import { EditorPreviewPlayComponent } from "./preview/play";

// import { applyImportedGuiFile } from "./preview/import/gui";
import { applyTextureAssetToObject } from "./preview/import/texture";
import { applyMaterialAssetToObject } from "./preview/import/material";
import { EditorPreviewConvertProgress } from "./preview/import/progress";
import { loadImportedSceneFile, tryConvertSceneFile } from "./preview/import/import";

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

    /**
     * Defines the fixed size of the preview.
     */
    fixedSize: ISize | null;
}

export class EditorPreview extends Component<IEditorPreviewProps, IEditorPreviewState> {
    /**
     * The engine of the preview.
     */
    public engine: AbstractEngine;
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

    /**
     * The play component of the preview.
     */
    public play: EditorPreviewPlayComponent;

    private _renderScene: boolean = true;
    private _mouseDownPosition: Vector2 = Vector2.Zero();

    private _meshUnderPointer: AbstractMesh | null;

    private _playIframeRef: HTMLIFrameElement | null = null;

    public constructor(props: IEditorPreviewProps) {
        super(props);

        this.state = {
            activeGizmo: "none",

            fixedSize: null,
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
                            hidden={this.play?.state.playing}
                            ref={(r) => this._onGotCanvasRef(r!)}
                            onDrop={(ev) => this._handleDrop(ev)}
                            onDragOver={(ev) => {
                                ev.preventDefault();
                                this._handleMouseMove(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);
                            }}
                            onBlur={() => this.setState({ isFocused: false })}
                            onFocus={() => this.setState({ isFocused: true })}
                            onPointerUp={(ev) => this._handleMouseClick(ev)}
                            onPointerDown={(ev) => this._handleMouseDown(ev)}
                            onMouseLeave={() => this._handleMouseLeave()}
                            onMouseMove={() => this._handleMouseMove(this.scene.pointerX, this.scene.pointerY)}
                            style={{
                                width: this.state.fixedSize?.width ? `${this.state.fixedSize.width}px` : undefined,
                                height: this.state.fixedSize?.height ? `${this.state.fixedSize.height}px` : undefined,
                            }}
                            className={`
                                select-none outline-none
                                ${this.state.fixedSize ? "object-contain" : "w-full h-full"}    
                            `}
                        />

                        {this.play?.state.playing &&
                            <>
                                {this.play.state.playingAddress &&
                                    <iframe ref={(r) => this._playIframeRef = r} src={this.play.state.playingAddress} className="w-full h-full select-none outline-none" />
                                }

                                {!this.play.state.playingAddress &&
                                    <div className="flex justify-center items-center w-full h-full">
                                        <Grid width={24} height={24} color="gray" />
                                    </div>
                                }
                            </>
                        }
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
        const selectedNode = object ?? this.props.editor.layout.graph.getSelectedNodes()[0]?.nodeData;
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

    private async _onGotCanvasRef(canvas: HTMLCanvasElement): Promise<void> {
        if (this.engine) {
            return;
        }

        Animation.AllowMatricesInterpolation = true;
        Animation.AllowMatrixDecomposeForInterpolation = true;

        const webGpuSupported = false;
        // const webGpuSupported = await WebGPUEngine.IsSupportedAsync;

        if (webGpuSupported) {
            this.engine = await this._createWebgpuEngine(canvas);
        } else {
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
        }

        this.scene = new Scene(this.engine);
        this.scene.autoClear = true;

        this.camera = new EditorCamera("camera", Vector3.Zero(), this.scene);
        this.camera.attachControl(true);

        this.gizmo = new EditorPreviewGizmo(this.scene);

        this.engine.hideLoadingUI();

        this.engine.runRenderLoop(() => {
            if (this._renderScene && !this.play.state.playing) {
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

    private async _createWebgpuEngine(canvas: HTMLCanvasElement): Promise<WebGPUEngine> {
        const glslangJs = require("@babylonjs/core/assets/glslang/glslang.cjs");
        const glslang = await glslangJs(join(process.cwd(), "../node_modules/@babylonjs/core/assets/glslang/glslang.wasm"));

        const twgslJs = require("@babylonjs/core/assets/twgsl/twgsl.cjs");
        const twgsl = await twgslJs(join(process.cwd(), "../node_modules/@babylonjs/core/assets/twgsl/twgsl.wasm"));

        const engine = new WebGPUEngine(canvas, {
            antialias: true,
            audioEngine: true,
            adaptToDeviceRatio: true,
            glslangOptions: {
                glslang,
            },
            twgslOptions: {
                twgsl,
            },
            useHighPrecisionMatrix: true,
            powerPreference: "high-performance",
        });

        await engine.initAsync();

        return engine;
    }

    private _handleMouseLeave(): void {
        this._restoreCurrentMeshUnderPointer();
        this._meshUnderPointer = null;
    }

    private _mouseMoveTimeoutId: number = -1;

    private _handleMouseMove(x: number, y: number): void {
        const pick = this.scene.pick(x, y, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);
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

        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m));

        let mesh = (pick.pickedMesh?._masterMesh ?? pick.pickedMesh) as Node;
        if (mesh) {
            const sceneLink = getRootSceneLink(mesh);
            if (sceneLink) {
                mesh = sceneLink;
            }

            // this.setCameraPreviewActive(null);

            this.gizmo.setAttachedNode(mesh);
            this.props.editor.layout.graph.setSelectedNode(mesh);
            this.props.editor.layout.inspector.setEditedObject(mesh);
            this.props.editor.layout.animations.setEditedObject(mesh);
        }
    }

    private _highlightCurrentMeshUnderPointer(pickedMesh: AbstractMesh): void {
        Tween.KillTweensOf(pickedMesh);

        const effectiveMesh = isInstancedMesh(pickedMesh)
            ? pickedMesh.sourceMesh
            : pickedMesh;

        const meshes = [effectiveMesh];

        if (isMesh(effectiveMesh)) {
            effectiveMesh.getLODLevels().forEach((lod) => {
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
            const effectiveMesh = isInstancedMesh(mesh)
                ? mesh.sourceMesh
                : mesh;

            const meshes = [effectiveMesh];

            if (isMesh(effectiveMesh)) {
                effectiveMesh.getLODLevels().forEach((lod) => {
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
                        <TooltipProvider>
                            <Select
                                disabled={this.play?.state.playing}
                                value={this.scene?.activeCamera?.id}
                                onValueChange={(v) => this._switchToCamera(v)}
                            >
                                <SelectTrigger className="w-36 border-none bg-muted/50">
                                    <SelectValue placeholder="Select Value..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {this.scene?.cameras.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Separator orientation="vertical" className="mx-2 h-[24px]" />

                            <Tooltip>
                                <TooltipTrigger>
                                    <Button active={this.state.activeGizmo === "position"} disabled={this.play?.state.playing} onClick={() => this.setActiveGizmo("position")} minimal icon={<PositionIcon width={16} />} className={`w-10 h-10 transition-all duration-300 ${this.state.activeGizmo === "position" ? "bg-muted/50" : ""} !rounded-lg`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Toggle position gizmo
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button active={this.state.activeGizmo === "rotation"} disabled={this.play?.state.playing} onClick={() => this.setActiveGizmo("rotation")} minimal icon={<RotationIcon width={16} />} className={`w-10 h-10 transition-all duration-300 ${this.state.activeGizmo === "position" ? "bg-muted/50" : ""} !rounded-lg`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Toggle rotation gizmo
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button active={this.state.activeGizmo === "scaling"} disabled={this.play?.state.playing} onClick={() => this.setActiveGizmo("scaling")} minimal icon={<ScalingIcon height={16} />} className={`w-10 h-10 transition-all duration-300 ${this.state.activeGizmo === "position" ? "bg-muted/50" : ""} !rounded-lg`} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Toggle scaling gizmo
                                </TooltipContent>
                            </Tooltip>

                            <Select
                                disabled={this.play?.state.playing}
                                value={this.gizmo?.getCoordinateMode().toString()}
                                onValueChange={(v) => {
                                    this.gizmo?.setCoordinatesMode(parseInt(v));
                                    this.forceUpdate();
                                }}
                            >
                                <SelectTrigger className="w-32 border-none bg-muted/50">
                                    <SelectValue placeholder="Select Value..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={GizmoCoordinatesMode.World.toString()}>World</SelectItem>
                                    <SelectItem value={GizmoCoordinatesMode.Local.toString()}>Local</SelectItem>
                                </SelectContent>
                            </Select>

                            <Separator orientation="vertical" className="mx-2 h-[24px]" />

                            <Tooltip>
                                <TooltipTrigger>
                                    <Button active={this.scene?.forceWireframe} minimal disabled={this.play?.state.playing} icon={<GiWireframeGlobe className="w-6 h-6" strokeWidth={1} color="white" />} className="w-10 h-10 bg-muted/50 !rounded-lg transition-all duration-300" onClick={() => {
                                        this.scene.forceWireframe = !this.scene.forceWireframe;
                                        this.forceUpdate();
                                    }} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Toggle wireframe
                                </TooltipContent>
                            </Tooltip>

                            <Separator orientation="vertical" className="mx-2 h-[24px]" />

                            <DropdownMenu>
                                <DropdownMenuTrigger disabled={this.play?.state.playing}>
                                    <Button minimal disabled={this.play?.state.playing} icon={<IoIosOptions className="w-6 h-6" strokeWidth={1} />} className="w-10 h-10 bg-muted/50 !rounded-lg transition-all duration-300" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent onClick={() => this.forceUpdate()}>
                                    <DropdownMenuLabel>Render options</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.scene.postProcessesEnabled = !this.scene.postProcessesEnabled}>
                                        {this.scene?.postProcessesEnabled && <FaCheck className="w-4 h-4" />} Post-processes enabled
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.scene.texturesEnabled = !this.scene.texturesEnabled}>
                                        {this.scene?.texturesEnabled && <FaCheck className="w-4 h-4" />} Textures enabled
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.scene.lightsEnabled = !this.scene.lightsEnabled}>
                                        {this.scene?.lightsEnabled && <FaCheck className="w-4 h-4" />} Lights enabled
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="flex gap-2 items-center" onClick={() => {
                                        this.scene.shadowsEnabled = !this.scene.shadowsEnabled;
                                        this.scene.renderTargetsEnabled = this.scene.shadowsEnabled;
                                    }}>
                                        {this.scene?.shadowsEnabled && <FaCheck className="w-4 h-4" />} Shadows enabled
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipProvider>
                    </div>

                    <div className="flex gap-2 items-center h-10">
                        <EditorPreviewPlayComponent
                            editor={this.props.editor}
                            ref={(r) => this.play = r!}
                            onRestart={() => {
                                if (this._playIframeRef) {
                                    this._playIframeRef.src = this._playIframeRef.src;
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    private _switchToCamera(id: string): void {
        const camera = this.scene.cameras.find((c) => c.id === id) ?? null;
        this.scene.activeCamera?.detachControl();

        this.scene.activeCamera = camera;
        this.scene.activeCamera?.attachControl(true);

        // Post-processes
        const ssao2Pipeline = serializeSSAO2RenderingPipeline();
        const ssrPipeline = serializeSSRRenderingPipeline();
        const motionBlurPipeline = serializeMotionBlurPostProcess();
        const defaultRenderingPipeline = serializeDefaultRenderingPipeline();

        disposeSSAO2RenderingPipeline();
        disposeSSRRenderingPipeline();
        disposeMotionBlurPostProcess();
        disposeDefaultRenderingPipeline();

        if (ssao2Pipeline) {
            parseSSAO2RenderingPipeline(this.props.editor, ssao2Pipeline);
        }

        if (ssrPipeline) {
            parseSSRRenderingPipeline(this.props.editor, ssrPipeline);
        }

        if (motionBlurPipeline) {
            parseMotionBlurPostProcess(this.props.editor, motionBlurPipeline);
        }

        if (defaultRenderingPipeline) {
            parseDefaultRenderingPipeline(this.props.editor, defaultRenderingPipeline);
        }
    }

    /**
     * Sets the currently active gizmo. Set "none" to deactivate the gizmo.
     * @param gizmo defines the type of gizmo to activate.
     */
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
        const assets = ev.dataTransfer.getData("assets");
        if (assets) {
            return this._handleAssetsDropped(ev);
        }

        const graphNode = ev.dataTransfer.getData("graph/node");
        if (graphNode) {
            return this._handleGraphNodesDropped(ev);
        }
    }

    private _handleGraphNodesDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
        const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);
        const mesh = pick.pickedMesh?._masterMesh ?? pick.pickedMesh;

        if (!mesh || !pick.pickedPoint) {
            return;
        }

        const pickedPoint = pick.pickedPoint.clone();

        const nodesToMove = this.props.editor.layout.graph.getSelectedNodes();
        const oldPositionsMap = new Map<unknown, Vector3>();

        nodesToMove.forEach((n) => {
            if (isTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
                oldPositionsMap.set(n.nodeData, n.nodeData.getAbsolutePosition().clone());
            }
        });

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                nodesToMove.forEach((n) => {
                    if (isTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
                        if (oldPositionsMap.has(n.nodeData)) {
                            n.nodeData.setAbsolutePosition(oldPositionsMap.get(n.nodeData)!);
                        }
                    }
                });
            },
            redo: () => {
                nodesToMove.forEach((n) => {
                    if (isTransformNode(n.nodeData) || isAbstractMesh(n.nodeData)) {
                        n.nodeData.setAbsolutePosition(pickedPoint);
                    }
                });
            },
        });
    }

    private _handleAssetsDropped(ev: React.DragEvent<HTMLCanvasElement>): void {
        const absolutePaths = this.props.editor.layout.assets.state.selectedKeys;

        absolutePaths.forEach(async (absolutePath) => {
            await waitNextAnimationFrame();
            const pick = this.scene.pick(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);
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
                    this.importSceneFile(absolutePath, true).then((result) => {
                        if (pick.pickedPoint) {
                            result?.meshes.forEach((m) => !m.parent && m.position.addInPlace(pick.pickedPoint!));
                            result?.transformNodes.forEach((t) => !t.parent && t.position.addInPlace(pick.pickedPoint!));
                        }
                    });
                    break;

                case ".env":
                case ".jpg":
                case ".png":
                case ".bmp":
                case ".jpeg":
                    applyTextureAssetToObject(this.props.editor, mesh ?? this.scene, absolutePath);
                    break;

                case ".material":
                    applyMaterialAssetToObject(this.props.editor, mesh, absolutePath);
                    break;

                case ".scene":
                    createSceneLink(this.props.editor, absolutePath).then((node) => {
                        if (pick.pickedPoint) {
                            node?.position.addInPlace(pick.pickedPoint);
                        }
                    });
                    break;

                // case ".gui":
                //     applyImportedGuiFile(this.props.editor, absolutePath).then(() => {
                //         this.props.editor.layout.graph.refresh();
                //     });
                //     break;
            }
        });
    }
}
