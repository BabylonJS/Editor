import { Component, ReactNode } from "react";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import { GridMaterial } from "@babylonjs/materials";
import { IoPause, IoPlay, IoRefresh, IoStop } from "react-icons/io5";

import { EditorInspectorNumberField } from "../../layout/inspector/fields/number";
import { Button } from "../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";
import type { IEffectEditor } from ".";
import type { IPlaybackControlState } from "./graph";
import { EffectEditorPreviewSelection } from "./preview-selection";

// Required for Babylon particles support in scene runtime.
import "@babylonjs/core/Particles/particleSystemComponent";
import "@babylonjs/core/Shaders/particles.fragment";
import "@babylonjs/core/Shaders/particles.vertex";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";

export interface IEffectEditorPreviewProps {
	filePath: string | null;
	onSceneReady?: (scene: Scene) => void;
	editor?: IEffectEditor;
	selectedNodeId?: string | number | null;
}

export class EffectEditorPreview extends Component<IEffectEditorPreviewProps> {
	public engine: Engine | null = null;
	public scene: Scene | null = null;
	public camera: ArcRotateCamera | null = null;

	private _lastFrameMs: number = performance.now();
	private readonly _playSpeedModel = { playSpeed: 1 };
	private _selectionVisual: EffectEditorPreviewSelection | null = null;

	public componentDidUpdate(prevProps: IEffectEditorPreviewProps): void {
		if (
			this._selectionVisual &&
			(prevProps.selectedNodeId !== this.props.selectedNodeId || prevProps.editor?.graph !== this.props.editor?.graph)
		) {
			this._syncSelectionVisual();
		}
	}

	public componentWillUnmount(): void {
		this._selectionVisual?.dispose();
		this._selectionVisual = null;
		this.scene?.dispose();
		this.engine?.dispose();
	}

	public resize(): void {
		this.engine?.resize();
	}

	public render(): ReactNode {
		const showPlaybackBar = this._hasTreeSelection();
		const controlState = showPlaybackBar ? this._getPlaybackControlState() : null;
		const isPlaying = controlState?.state === "playing";
		const playPauseTooltip = controlState?.reason ?? (isPlaying ? "Pause" : "Play");
		const stopTooltip = controlState?.reason ?? "Stop";
		const restartTooltip = controlState?.reason ?? "Restart";
		return (
			<div className="relative w-full h-full">
				<canvas ref={(r) => this._onGotCanvasRef(r)} className="w-full h-full outline-none" />
				{showPlaybackBar && controlState != null && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2147483647] flex items-center gap-2 rounded-md border border-border bg-background/95 px-2 py-1.5 shadow-md backdrop-blur-sm">
						<TooltipProvider>
							<>
								<div className="min-w-[9.5rem] max-w-[10.5rem] shrink-0 [&>div]:px-1">
									<EditorInspectorNumberField
										object={this._playSpeedModel}
										property="playSpeed"
										label="Speed"
										min={0}
										max={100}
										step={0.1}
										grayLabel
										noUndoRedo
									/>
								</div>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="secondary"
											size="icon"
											onClick={() => this._handlePlayPause()}
											className="h-10 w-10 shrink-0"
											disabled={!controlState.canPlayPause}
										>
											{isPlaying ? <IoPause className="w-5 h-5" /> : <IoPlay className="w-5 h-5" />}
										</Button>
									</TooltipTrigger>
									<TooltipContent>{playPauseTooltip}</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="secondary"
											size="icon"
											onClick={() => this._handleStop()}
											className="h-10 w-10 shrink-0"
											disabled={!controlState.canStop}
										>
											<IoStop className="w-5 h-5" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>{stopTooltip}</TooltipContent>
								</Tooltip>
								{controlState.state !== "unavailable" && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="secondary"
												size="icon"
												onClick={() => this._handleRestart()}
												className="h-10 w-10 shrink-0"
												disabled={!controlState.canRestart}
											>
												<IoRefresh className="w-5 h-5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{restartTooltip}</TooltipContent>
									</Tooltip>
								)}
							</>
						</TooltipProvider>
					</div>
				)}
			</div>
		);
	}

	/** True when the graph reports a real tree node for the current selection (hides preview bar when nothing is selected). */
	private _hasTreeSelection(): boolean {
		const id = this.props.selectedNodeId;
		if (id === null || id === undefined || id === "") {
			return false;
		}
		return this.props.editor?.graph?.getNodeData(id) != null;
	}

	/** Returns current playback state/availability for selected node. */
	private _getPlaybackControlState(): IPlaybackControlState {
		return this.props.editor?.graph?.getNodePlaybackControlState(this.props.selectedNodeId) ?? {
			state: "unavailable",
			canPlayPause: false,
			canStop: false,
			canRestart: false,
			reason: "Preview is not ready.",
		};
	}

	/** Initializes Babylon engine/scene and starts quarks update loop. */
	private _onGotCanvasRef(canvas: HTMLCanvasElement | null): void {
		if (!canvas || this.engine) {
			return;
		}

		this.engine = new Engine(canvas, true, { antialias: true, adaptToDeviceRatio: true });
		this.scene = new Scene(this.engine);
		this.scene.clearColor = new Color4(0.1, 0.1, 0.1, 1.0);
		this.scene.ambientColor = new Color3(1, 1, 1);

		this.camera = new ArcRotateCamera("Camera", 0, 0.8, 4, Vector3.Zero(), this.scene);
		this.camera.doNotSerialize = true;
		this.camera.lowerRadiusLimit = 3;
		this.camera.upperRadiusLimit = 10;
		this.camera.wheelPrecision = 20;
		this.camera.minZ = 0.001;
		this.camera.attachControl(canvas, true);
		this.camera.useFramingBehavior = true;
		this.camera.wheelDeltaPercentage = 0.01;
		this.camera.pinchDeltaPercentage = 0.01;
		this.scene.activeCamera = this.camera;

		const sunLight = new DirectionalLight("sun", new Vector3(-1, -1, -1), this.scene);
		sunLight.intensity = 1.0;
		sunLight.diffuse = new Color3(1, 1, 1);
		sunLight.specular = new Color3(1, 1, 1);

		const groundMaterial = new GridMaterial("groundMaterial", this.scene);
		groundMaterial.majorUnitFrequency = 2;
		groundMaterial.minorUnitVisibility = 0.1;
		groundMaterial.gridRatio = 0.5;
		groundMaterial.backFaceCulling = false;
		groundMaterial.mainColor = new Color3(1, 1, 1);
		groundMaterial.lineColor = new Color3(1.0, 1.0, 1.0);
		groundMaterial.opacity = 0.5;

		const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
		ground.material = groundMaterial;

		this._selectionVisual = new EffectEditorPreviewSelection(this.scene);
		this._syncSelectionVisual();

		this.engine.runRenderLoop(() => {
			const now = performance.now();
			const deltaSeconds = Math.min((now - this._lastFrameMs) / 1000, 0.1);
			this._lastFrameMs = now;
			const scaledDelta = deltaSeconds * this._playSpeedModel.playSpeed;
			for (const effect of this.props.editor?.graph?.getAllEffects() ?? []) {
				effect.update(scaledDelta);
			}
			this.scene?.render();
		});

		window.addEventListener("resize", () => this.engine?.resize());
		this.props.onSceneReady?.(this.scene);
		this.forceUpdate();
	}

	/** Updates position gizmo + selection ring for the current graph selection. */
	private _syncSelectionVisual(): void {
		if (!this._selectionVisual) {
			return;
		}

		const id = this.props.selectedNodeId;
		if (id === null || id === undefined || id === "" || !this.props.editor?.graph?.getNodeData(id)) {
			this._selectionVisual.attachTo(null);
			return;
		}

		const transform = this.props.editor.graph.getNodeTransform(id);
		this._selectionVisual.attachTo(transform);
	}

	/** Toggles selected node play/pause via graph bridge API. */
	private _handlePlayPause(): void {
		if (!this.props.selectedNodeId || !this.props.editor?.graph) {
			return;
		}

		this.props.editor.graph.toggleNodePlayback(this.props.selectedNodeId);
	}

	/** Stops selected node playback via graph bridge API. */
	private _handleStop(): void {
		if (!this.props.selectedNodeId || !this.props.editor?.graph) {
			return;
		}

		this.props.editor.graph.stopNode(this.props.selectedNodeId);
	}

	/** Restarts selected node playback via graph bridge API. */
	private _handleRestart(): void {
		if (!this.props.selectedNodeId || !this.props.editor?.graph) {
			return;
		}

		this.props.editor.graph.restartNode(this.props.selectedNodeId);
	}
}
