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

import { Button } from "../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";
import type { IEffectEditor } from ".";
import type { IPlaybackControlState } from "./graph";

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

	public constructor(props: IEffectEditorPreviewProps) {
		super(props);
	}

	public componentWillUnmount(): void {
		this.scene?.dispose();
		this.engine?.dispose();
	}

	public resize(): void {
		this.engine?.resize();
	}

	public render(): ReactNode {
		const controlState = this._getPlaybackControlState();
		const isPlaying = controlState.state === "playing";
		const playPauseTooltip = controlState.reason ?? (isPlaying ? "Pause" : "Play");
		const stopTooltip = controlState.reason ?? "Stop";
		const restartTooltip = controlState.reason ?? "Restart";
		return (
			<div className="relative w-full h-full">
				<canvas ref={(r) => this._onGotCanvasRef(r)} className="w-full h-full outline-none" />
				{this.props.selectedNodeId && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="icon"
										onClick={() => this._handlePlayPause()}
										className="w-10 h-10"
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
										className="w-10 h-10"
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
											className="w-10 h-10"
											disabled={!controlState.canRestart}
										>
											<IoRefresh className="w-5 h-5" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>{restartTooltip}</TooltipContent>
								</Tooltip>
							)}
						</TooltipProvider>
					</div>
				)}
			</div>
		);
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

		this.engine.runRenderLoop(() => {
			const now = performance.now();
			const deltaSeconds = Math.min((now - this._lastFrameMs) / 1000, 0.1);
			this._lastFrameMs = now;
			for (const effect of this.props.editor?.graph?.getAllEffects() ?? []) {
				effect.update(deltaSeconds);
			}
			this.scene?.render();
		});

		window.addEventListener("resize", () => this.engine?.resize());
		this.props.onSceneReady?.(this.scene);
		this.forceUpdate();
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
