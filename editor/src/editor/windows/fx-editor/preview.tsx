import { Component, ReactNode } from "react";

import { Engine, Scene, ArcRotateCamera, DirectionalLight, Vector3, Color3, Color4, MeshBuilder } from "babylonjs";
import { GridMaterial } from "babylonjs-materials";

import { Button } from "../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

export interface IFXEditorPreviewProps {
	filePath: string | null;
}

export interface IFXEditorPreviewState {
	playing: boolean;
}

export class FXEditorPreview extends Component<IFXEditorPreviewProps, IFXEditorPreviewState> {
	public engine: Engine | null = null;
	public scene: Scene | null = null;
	public camera: ArcRotateCamera | null = null;

	private _canvasRef: HTMLCanvasElement | null = null;
	private _renderLoopId: number = -1;

	public constructor(props: IFXEditorPreviewProps) {
		super(props);

		this.state = {
			playing: false,
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<canvas ref={(r) => this._onGotCanvasRef(r!)} className="w-full h-full outline-none" />

				{/* Play/Stop/Restart buttons */}
				<div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="secondary" size="icon" onClick={() => this._handlePlayStop()} className="w-10 h-10">
									{this.state.playing ? <IoStop className="w-5 h-5" /> : <IoPlay className="w-5 h-5" />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>{this.state.playing ? "Stop" : "Play"}</TooltipContent>
						</Tooltip>

						{this.state.playing && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="secondary" size="icon" onClick={() => this._handleRestart()} className="w-10 h-10">
										<IoRefresh className="w-5 h-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Restart</TooltipContent>
							</Tooltip>
						)}
					</TooltipProvider>
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		// Canvas ref will be set in render, _onGotCanvasRef will be called automatically
	}

	public componentWillUnmount(): void {
		if (this._renderLoopId !== -1) {
			cancelAnimationFrame(this._renderLoopId);
		}

		this.scene?.dispose();
		this.engine?.dispose();
	}

	/**
	 * Resizes the engine.
	 */
	public resize(): void {
		this.engine?.resize();
	}

	private async _onGotCanvasRef(canvas: HTMLCanvasElement | null): Promise<void> {
		if (!canvas || this.engine) {
			return;
		}

		this._canvasRef = canvas;

		this.engine = new Engine(this._canvasRef, true, {
			antialias: true,
			adaptToDeviceRatio: true,
		});

		this.scene = new Scene(this.engine);

		// Scene settings
		this.scene.clearColor = new Color4(0.1, 0.1, 0.1, 1.0);
		this.scene.ambientColor = new Color3(1, 1, 1);

		// Camera
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

		// Directional light (sun)
		const sunLight = new DirectionalLight("sun", new Vector3(-1, -1, -1), this.scene);
		sunLight.intensity = 1.0;
		sunLight.diffuse = new Color3(1, 1, 1);
		sunLight.specular = new Color3(1, 1, 1);

		// Ground with grid material
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

		// Render loop
		this.engine.runRenderLoop(() => {
			if (this.scene) {
				this.scene.render();
			}
		});

		// Handle resize
		window.addEventListener("resize", () => {
			this.engine?.resize();
		});

		this.forceUpdate();
	}

	private _handlePlayStop(): void {
		this.setState({ playing: !this.state.playing });
	}

	private _handleRestart(): void {
		if (!this.scene) {
			return;
		}

		// Restart all particle systems
		this.scene.particleSystems.forEach((ps) => {
			ps.reset();
		});

		this.setState({ playing: false }, () => {
			this.setState({ playing: true });
		});
	}
}
