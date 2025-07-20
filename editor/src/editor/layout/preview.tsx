import { ipcRenderer } from "electron";
import { extname, basename, join } from "path/posix";

import { toast } from "sonner";
import { Component, MouseEvent, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { FaCheck } from "react-icons/fa6";
import { GiWireframeGlobe } from "react-icons/gi";
import { IoIosOptions, IoIosStats } from "react-icons/io";

import {
	AbstractEngine,
	AbstractMesh,
	Animation,
	Camera,
	Color3,
	CubicEase,
	EasingFunction,
	Engine,
	GizmoCoordinatesMode,
	ISceneLoaderAsyncResult,
	Node,
	Scene,
	Vector2,
	Vector3,
	Viewport,
	WebGPUEngine,
	HavokPlugin,
	PickingInfo,
	SceneLoaderFlags,
} from "babylonjs";

import { Toggle } from "../../ui/shadcn/ui/toggle";
import { Button } from "../../ui/shadcn/ui/button";
import { Progress } from "../../ui/shadcn/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/shadcn/ui/select";

import { Editor } from "../main";

import { Tween } from "../../tools/animation/tween";
import { registerUndoRedo } from "../../tools/undoredo";
import { initializeHavok } from "../../tools/physics/init";
import { onTextureAddedObservable } from "../../tools/observables";
import { waitNextAnimationFrame, waitUntil } from "../../tools/tools";
import { checkProjectCachedCompressedTextures } from "../../tools/ktx/check";
import { createSceneLink, getRootSceneLink } from "../../tools/scene/scene-link";
import { isAbstractMesh, isCamera, isCollisionInstancedMesh, isCollisionMesh, isInstancedMesh, isMesh, isTransformNode } from "../../tools/guards/nodes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../ui/shadcn/ui/dropdown-menu";

import { EditorCamera } from "../nodes/camera";

import { PositionIcon } from "../../ui/icons/position";
import { RotationIcon } from "../../ui/icons/rotation";
import { ScalingIcon } from "../../ui/icons/scaling";

import { SpinnerUIComponent } from "../../ui/spinner";
import { Separator } from "../../ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/shadcn/ui/tooltip";

import { saveRenderingConfigurationForCamera } from "../rendering/tools";
import { disposeVLSPostProcess, parseVLSPostProcess, vlsPostProcessCameraConfigurations } from "../rendering/vls";
import { disposeSSRRenderingPipeline, parseSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "../rendering/ssr";
import { disposeSSAO2RenderingPipeline, parseSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "../rendering/ssao";
import { disposeMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations, parseMotionBlurPostProcess } from "../rendering/motion-blur";
import { defaultPipelineCameraConfigurations, disposeDefaultRenderingPipeline, parseDefaultRenderingPipeline } from "../rendering/default-pipeline";

import { EditorGraphContextMenu } from "./graph/graph";

import { EditorPreviewGizmo } from "./preview/gizmo";
import { EditorPreviewIcons } from "./preview/icons";
import { EditorPreviewPlayComponent } from "./preview/play";

import { Stats } from "./preview/stats/stats";
import { StatRow } from "./preview/stats/row";
import { StatsValuesType } from "./preview/stats/types";

import { applySoundAsset } from "./preview/import/sound";
import { applyImportedGuiFile } from "./preview/import/gui";
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
	 * Defines the information message drawn over the preview to tell the user what is happening.
	 */
	informationMessage: ReactNode;

	/**
	 * Defines wether or not picking is enabled in the preview.
	 */
	pickingEnabled: boolean;
	/**
	 * Defines the type of gizmo that is currently active.
	 * If "none", no gizmo is active.
	 */
	activeGizmo: "position" | "rotation" | "scaling" | "none";
	/**
	 * Defines wether or not the preview is focused in the editor.
	 */
	isFocused: boolean;

	/**
	 * Defines the reference to the object that was right-clicked.
	 */
	rightClickedObject?: any;

	/**
	 * Defines the fixed dimensions of the preview canvas.
	 * "fit" means the canvas will fit the entire panel container.
	 */
	fixedDimensions: "720p" | "1080p" | "4k" | "fit";

	showStatsValues: boolean;
	statsValues?: StatsValuesType;

	playSceneLoadingProgress: number;
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

	/**
	 * The current statistics of the preview.
	 * This is used to display the FPS and other values.
	 */
	public statistics: Stats;

	private _renderScene: boolean = true;
	private _mouseDownPosition: Vector2 = Vector2.Zero();

	private _meshUnderPointer: AbstractMesh | null;

	public constructor(props: IEditorPreviewProps) {
		super(props);

		this.state = {
			activeGizmo: "none",
			pickingEnabled: true,
			isFocused: false,
			informationMessage: "",
			fixedDimensions: "fit",

			showStatsValues: false,

			playSceneLoadingProgress: 0,
		};

		ipcRenderer.on("gizmo:position", () => this.setActiveGizmo("position"));
		ipcRenderer.on("gizmo:rotation", () => this.setActiveGizmo("rotation"));
		ipcRenderer.on("gizmo:scaling", () => this.setActiveGizmo("scaling"));

		document.addEventListener("copy", () => this.state.isFocused && this.props.editor.layout.graph.copySelectedNodes());
		document.addEventListener("paste", () => this.state.isFocused && this.props.editor.layout.graph.pasteSelectedNodes());

		ipcRenderer.on("preview:focus", () => this.state.isFocused && this.focusObject());
		ipcRenderer.on("preview:edit-camera", () => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera));

		onTextureAddedObservable.add(() => checkProjectCachedCompressedTextures(props.editor));
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full text-foreground">
				<div className="flex flex-col w-full h-full">
					{this._getToolbar()}

					<EditorGraphContextMenu editor={this.props.editor} object={this.state.rightClickedObject} onOpenChange={(o) => !o && this._resetPointerContextInfo()}>
						<canvas
							ref={(r) => this._onGotCanvasRef(r!)}
							onDrop={(ev) => this._handleDrop(ev)}
							onDragOver={(ev) => {
								ev.preventDefault();
								this._handleMouseMove(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);
							}}
							onBlur={() => this.setState({ isFocused: false })}
							onFocus={() => this.setState({ isFocused: true })}
							onPointerUp={(ev) => this._handleMouseUp(ev)}
							onPointerDown={(ev) => this._handleMouseDown(ev)}
							onMouseLeave={() => this._handleMouseLeave()}
							onMouseMove={() => this._handleMouseMove(this.scene.pointerX, this.scene.pointerY)}
							className={`
                                select-none outline-none w-full h-full object-contain
                                ${this.state.fixedDimensions !== "fit" ? "bg-black" : "bg-background"}
                                transition-all duration-300 ease-in-out
                            `}
						/>

						{(this.play?.state.preparingPlay || this.play?.state.loading) && (
							<div className="absolute top-0 left-0 w-full h-full bg-black">
								<div className="flex flex-col justify-center items-center gap-10 w-full h-full bg-black">
									<Grid width={24} height={24} color="gray" />

									{this.play?.state.loading && <Progress className="w-1/2" value={this.state.playSceneLoadingProgress * 100} />}
								</div>
							</div>
						)}
					</EditorGraphContextMenu>
				</div>

				<EditorGraphContextMenu editor={this.props.editor} object={this.state.rightClickedObject} onOpenChange={(o) => !o && this._resetPointerContextInfo()}>
					<EditorPreviewIcons ref={(r) => this._onGotIconsRef(r!)} editor={this.props.editor} />
				</EditorGraphContextMenu>

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
	 * Resizes the engine.
	 */
	public resize(): void {
		if (this.state.fixedDimensions === "fit") {
			this.engine?.resize();
		}
	}

	/**
	 * Resets the preview component by re-creating the engine and an empty scene.
	 */
	public async reset(): Promise<void> {
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

		return this._onGotCanvasRef(canvas);
	}

	/**
	 * Sets the fixed dimensions of the renderer. This is particularly useful to test the rendering
	 * performances and the aspect ratio of the scene in case it'll be renderer in fullscreen.
	 */
	public setFixedDimensions(fixedDimensions: "720p" | "1080p" | "4k" | "fit"): void {
		this.setState({
			fixedDimensions,
		});

		switch (fixedDimensions) {
			case "720p":
				this.engine?.setSize(1280, 720);
				break;
			case "1080p":
				this.engine?.setSize(1920, 1080);
				break;
			case "4k":
				this.engine?.setSize(3840, 2160);
				break;
			default:
				this.engine?.resize();
				break;
		}
	}

	/**
	 * Tries to focused the given object or the first one selected in the graph.
	 */
	public focusObject(object?: any): void {
		const selectedNode = object ?? this.props.editor.layout.graph.getSelectedNodes()[0]?.nodeData;
		if (!selectedNode) {
			return;
		}

		const position = isCamera(selectedNode) ? selectedNode.globalPosition : selectedNode.getAbsolutePosition?.();

		const camera = this.scene.activeCamera;
		if (position && camera) {
			Tween.create(camera, 0.5, {
				target: position,
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
			this.icons?.start();
		});
	}

	private async _onGotCanvasRef(canvas: HTMLCanvasElement): Promise<void> {
		if (this.engine) {
			return;
		}

		await waitUntil(() => this.props.editor.path);
		await initializeHavok(this.props.editor.path!);

		SceneLoaderFlags.ShowLoadingScreen = false;

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
				useExactSrgbConversions: true,
			});
		}

		this.engine.disableContextMenu = false;

		this.scene = new Scene(this.engine);
		this.scene.autoClear = true;

		if (!this.scene.soundTracks && this.scene.mainSoundTrack) {
			this.scene.soundTracks = [this.scene.mainSoundTrack];
		}

		this.camera = new EditorCamera("camera", Vector3.Zero(), this.scene);
		this.camera.attachControl(true);

		this.gizmo = new EditorPreviewGizmo(this.scene);

		this.engine.hideLoadingUI();

		this.engine.runRenderLoop(() => {
			if (this._renderScene && !this.play.state.playing) {
				return this.scene.render();
			}

			if (this.play.canPlayScene) {
				try {
					return this.play.scene?.render();
				} catch (e) {
					if (e instanceof Error) {
						this.props.editor.layout.console.error(`Error while playing the scene:\n${e.message}`);
					}
					console.error(e);
					this.play.stop();
				}
			}
		});

		Tween.Scene = this.scene;
		Tween.DefaultEasing = {
			type: new CubicEase(),
			mode: EasingFunction.EASINGMODE_EASEINOUT,
		};

		this.scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin());

		this.statistics = new Stats(this.props.editor);
		this.statistics.onValuesChangedObservable.add((values) => {
			if (this.state.showStatsValues) {
				this.setState({
					statsValues: { ...values },
				});
			}
		});

		this.icons?.start();
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
		if (!this.state.pickingEnabled) {
			return;
		}

		const pickingInfo = this._getPickingInfo(x, y);
		const mesh = pickingInfo.pickedMesh?._masterMesh ?? pickingInfo.pickedMesh;

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
		if (!this.state.pickingEnabled) {
			return;
		}

		this._mouseDownPosition.set(event.clientX, event.clientY);

		if (event.button === 2) {
			this.setState({
				rightClickedObject: this._meshUnderPointer,
			});
		}

		this._restoreCurrentMeshUnderPointer();
		this._meshUnderPointer = null;

		if (event.button === 2) {
			this.scene.activeCamera?.inputs.detachElement();
			this._handleMouseUp(event);
		}
	}

	private _handleMouseUp(event: MouseEvent<HTMLCanvasElement, globalThis.MouseEvent>): void {
		if (!this.state.pickingEnabled) {
			return;
		}

		const distance = Vector2.Distance(this._mouseDownPosition, new Vector2(event.clientX, event.clientY));

		if (distance > 2) {
			return;
		}

		const pickingInfo = this._getPickingInfo(this.scene.pointerX, this.scene.pointerY);

		let mesh = (pickingInfo.pickedMesh?._masterMesh ?? pickingInfo.pickedMesh) as Node;
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

	private _getPickingInfo(x: number, y: number): PickingInfo {
		const decalPick = this.scene.pick(
			x,
			y,
			(m) => {
				return m.metadata?.decal && m.isVisible && m.isEnabled();
			},
			false
		);

		const meshPick = this.scene.pick(
			x,
			y,
			(m) => {
				return !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m) && m.isVisible && m.isEnabled();
			},
			false
		);

		let pickingInfo = meshPick;
		if (decalPick?.pickedPoint && meshPick?.pickedPoint) {
			const distance = Vector3.Distance(decalPick.pickedPoint, meshPick.pickedPoint);
			const zOffset = decalPick.pickedMesh?.material?.zOffset ?? 0;

			if (distance <= zOffset + 0.01) {
				pickingInfo = decalPick;
			}
		}

		return pickingInfo;
	}

	private _resetPointerContextInfo(): void {
		if (this.state.rightClickedObject) {
			this.setState({
				rightClickedObject: null,
			});

			this.scene.activeCamera?.inputs.attachElement();
		}
	}

	private _highlightCurrentMeshUnderPointer(pickedMesh: AbstractMesh): void {
		Tween.killTweensOf(pickedMesh);

		const effectiveMesh = isInstancedMesh(pickedMesh) ? pickedMesh.sourceMesh : pickedMesh;

		const meshes = [effectiveMesh];

		if (isMesh(effectiveMesh)) {
			effectiveMesh.getLODLevels().forEach((lod) => {
				if (lod.mesh) {
					meshes.push(lod.mesh);
				}
			});
		}

		meshes.forEach((mesh) => {
			Tween.create(mesh, 0.1, {
				overlayAlpha: 0.5,
				overlayColor: Color3.Black(),
				onStart: () => (mesh!.renderOverlay = true),
			});
		});
	}

	private _restoreCurrentMeshUnderPointer(): void {
		const mesh = this._meshUnderPointer;

		if (mesh) {
			const effectiveMesh = isInstancedMesh(mesh) ? mesh.sourceMesh : mesh;

			const meshes = [effectiveMesh];

			if (isMesh(effectiveMesh)) {
				effectiveMesh.getLODLevels().forEach((lod) => {
					if (lod.mesh) {
						meshes.push(lod.mesh);
					}
				});
			}

			meshes.forEach((mesh) => {
				Tween.killTweensOf(mesh);

				mesh.overlayAlpha ??= 0;
				mesh.overlayColor ??= Color3.Black();

				Tween.create(mesh, 0.1, {
					overlayAlpha: 0,
					overlayColor: Color3.Black(),
					onStart: () => (mesh.renderOverlay = true),
				});
			});
		}
	}

	private _getToolbar(): ReactNode {
		return (
			<div className="absolute top-0 left-0 w-full h-12 z-10">
				<div className="flex justify-between items-center gap-4 h-full bg-background/95 w-full px-2 py-1">
					{
						this.play?.state.playing && <div /> // For justify between
					}

					{!this.play?.state.playing && this._getEditToolbar()}

					<div className="flex gap-2 items-center h-10">
						<EditorPreviewPlayComponent editor={this.props.editor} ref={(r) => (this.play = r!)} onRestart={() => this.play.restart()} />
					</div>
				</div>
			</div>
		);
	}

	private _getEditToolbar(): ReactNode {
		return (
			<div className="flex gap-2 items-center h-10">
				<TooltipProvider>
					<Select value={this.scene?.activeCamera?.id} onOpenChange={(o) => o && this.forceUpdate()} onValueChange={(v) => this._switchToCamera(v)}>
						<SelectTrigger className="w-36 border-none bg-muted/50">
							<SelectValue placeholder="Select Value..." />
						</SelectTrigger>
						<SelectContent>
							{this.scene?.cameras.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Separator orientation="vertical" className="mx-2 h-[24px]" />

					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle pressed={this.state.activeGizmo === "position"} onPressedChange={() => this.setActiveGizmo("position")}>
								<PositionIcon height={16} />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>Toggle position gizmo</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle pressed={this.state.activeGizmo === "rotation"} onPressedChange={() => this.setActiveGizmo("rotation")}>
								<RotationIcon height={16} />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>Toggle rotation gizmo</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle pressed={this.state.activeGizmo === "scaling"} onPressedChange={() => this.setActiveGizmo("scaling")}>
								<ScalingIcon height={16} />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>Toggle scaling gizmo</TooltipContent>
					</Tooltip>

					<Select
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
						<TooltipTrigger asChild>
							<Toggle
								className="!px-2 !py-2"
								pressed={this.scene?.forceWireframe}
								onPressedChange={() => {
									this.scene.forceWireframe = !this.scene.forceWireframe;
									this.forceUpdate();
								}}
							>
								<GiWireframeGlobe className="w-6 h-6 scale-125" strokeWidth={1} color="white" />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>Toggle wireframe</TooltipContent>
					</Tooltip>

					<Separator orientation="vertical" className="mx-2 h-[24px]" />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="px-1 py-1 w-9 h-9">
								<IoIosOptions className="w-6 h-6" strokeWidth={1} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent onClick={() => this.forceUpdate()}>
							<DropdownMenuLabel>Render options</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.icons.enabled ? this.icons.stop() : this.icons.start())}>
								{this.icons?.enabled && <FaCheck className="w-4 h-4" />} Helper Icons
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.postProcessesEnabled = !this.scene.postProcessesEnabled)}>
								{this.scene?.postProcessesEnabled && <FaCheck className="w-4 h-4" />} Post-processes enabled
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.texturesEnabled = !this.scene.texturesEnabled)}>
								{this.scene?.texturesEnabled && <FaCheck className="w-4 h-4" />} Textures enabled
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.lightsEnabled = !this.scene.lightsEnabled)}>
								{this.scene?.lightsEnabled && <FaCheck className="w-4 h-4" />} Lights enabled
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex gap-2 items-center"
								onClick={() => {
									this.scene.shadowsEnabled = !this.scene.shadowsEnabled;
									this.scene.renderTargetsEnabled = this.scene.shadowsEnabled;
								}}
							>
								{this.scene?.shadowsEnabled && <FaCheck className="w-4 h-4" />} Shadows enabled
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => (this.scene.particlesEnabled = !this.scene.particlesEnabled)}>
								{this.scene?.particlesEnabled && <FaCheck className="w-4 h-4" />} Particles enabled
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Renderer dimensions</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("720p")}>
								{this.state.fixedDimensions === "720p" && <FaCheck className="w-4 h-4" />} 720p
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("1080p")}>
								{this.state.fixedDimensions === "1080p" && <FaCheck className="w-4 h-4" />} 1080p
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("4k")}>
								{this.state.fixedDimensions === "4k" && <FaCheck className="w-4 h-4" />} 4K (UHD)
							</DropdownMenuItem>
							<DropdownMenuItem className="flex gap-2 items-center" onClick={() => this.setFixedDimensions("fit")}>
								{this.state.fixedDimensions === "fit" && <FaCheck className="w-4 h-4" />} Fit
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu onOpenChange={(o) => this.setState({ showStatsValues: o })}>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="px-1 py-1 w-9 h-9">
								<IoIosStats className="w-6 h-6" strokeWidth={1} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-72" onClick={() => this.forceUpdate()}>
							<DropdownMenuLabel>Statistics</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="flex flex-col gap-1">
								<StatRow label="Average FPS" value={this.state.statsValues?.averageFPS} />
								<StatRow label="Instantaneous FPS" value={this.state.statsValues?.instantaneousFPS} />
								<StatRow label="Draw Calls" value={this.state.statsValues?.drawCalls} />
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="flex flex-col gap-1">
								<StatRow label="Active Faces" value={this.state.statsValues?.activeFaces} />
								<StatRow label="Active Meshes" value={this.state.statsValues?.activeMeshes} />
								<StatRow label="Active Indices" value={this.state.statsValues?.activeIndices} />
								<StatRow label="Active Bones" value={this.state.statsValues?.activeBones} />
								<StatRow label="Active Particles" value={this.state.statsValues?.activeParticles} />
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="flex flex-col gap-1">
								<StatRow label="Total Meshes" value={this.state.statsValues?.totalMeshes} />
								<StatRow label="Total Vertices" value={this.state.statsValues?.totalVertices} />
								<StatRow label="Total Materials" value={this.state.statsValues?.totalMaterials} />
								<StatRow label="Total Textures" value={this.state.statsValues?.totalTextures} />
								<StatRow label="Total Lights" value={this.state.statsValues?.totalLights} />
							</DropdownMenuLabel>
						</DropdownMenuContent>
					</DropdownMenu>
				</TooltipProvider>
			</div>
		);
	}

	private _switchToCamera(id: string): void {
		const camera = this.scene.cameras.find((c) => c.id === id);
		if (!camera) {
			return;
		}

		if (this.scene.activeCamera) {
			saveRenderingConfigurationForCamera(this.scene.activeCamera);
		}

		this.scene.activeCamera?.detachControl();

		this.scene.activeCamera = camera;
		this.scene.activeCamera?.attachControl(true);

		disposeSSAO2RenderingPipeline();
		disposeVLSPostProcess(this.props.editor);
		disposeSSRRenderingPipeline();
		disposeMotionBlurPostProcess();
		disposeDefaultRenderingPipeline();

		const ssao2Pipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
		if (ssao2Pipeline) {
			parseSSAO2RenderingPipeline(this.props.editor, ssao2Pipeline);
		}

		const vlsPostProcess = vlsPostProcessCameraConfigurations.get(camera);
		if (vlsPostProcess) {
			parseVLSPostProcess(this.props.editor, vlsPostProcess);
		}

		const ssrPipeline = ssrRenderingPipelineCameraConfigurations.get(camera);
		if (ssrPipeline) {
			parseSSRRenderingPipeline(this.props.editor, ssrPipeline);
		}

		const motionBlurPostProcess = motionBlurPostProcessCameraConfigurations.get(camera);
		if (motionBlurPostProcess) {
			parseMotionBlurPostProcess(this.props.editor, motionBlurPostProcess);
		}

		const defaultRenderingPipeline = defaultPipelineCameraConfigurations.get(camera);
		if (defaultRenderingPipeline) {
			parseDefaultRenderingPipeline(this.props.editor, defaultRenderingPipeline);
		}

		this.scene.lights.forEach((light) => {
			light.getShadowGenerators()?.forEach((shadowGenerator) => {
				const shadowMap = shadowGenerator.getShadowMap();
				if (shadowMap) {
					shadowMap.activeCamera = camera;
				}
			});
		});

		this.props.editor.layout.inspector.forceUpdate();
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
						informationMessage: <EditorPreviewConvertProgress absolutePath={absolutePath} ref={(r) => (progressRef = r!)} />,
					});

					const newAbsolutePath = await tryConvertSceneFile(absolutePath, (value) => progressRef?.setState({ value }));

					if (newAbsolutePath) {
						absolutePath = newAbsolutePath;
					} else {
						useCloudConverter = false;

						toast.error("Failed to convert the file. Fallback on local Assimp loader.");
						this.setState({
							informationMessage: null,
						});
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
					this.importSceneFile(absolutePath, !ev.shiftKey).then((result) => {
						if (pick.pickedPoint) {
							result?.meshes.forEach((m) => !m.parent && m.position.addInPlace(pick.pickedPoint!));
							result?.transformNodes.forEach((t) => !t.parent && t.position.addInPlace(pick.pickedPoint!));
						}
					});
					break;

				case ".env":
				case ".jpg":
				case ".png":
				case ".webp":
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

				case ".gui":
					if (this.props.editor.state.enableExperimentalFeatures) {
						applyImportedGuiFile(this.props.editor, absolutePath).then(() => {
							this.props.editor.layout.graph.refresh();
						});
					}
					break;

				case ".mp3":
				case ".ogg":
				case ".wav":
				case ".wave":
					if (this.props.editor.state.enableExperimentalFeatures) {
						applySoundAsset(this.props.editor, mesh ?? this.scene, absolutePath).then(() => {
							this.props.editor.layout.graph.refresh();
						});
					}
					break;
			}
		});
	}
}
