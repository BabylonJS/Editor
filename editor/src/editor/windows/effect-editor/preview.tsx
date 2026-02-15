import { Component, ReactNode } from "react";

import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GridMaterial } from "@babylonjs/materials";

import { Button } from "../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";
import type { IEffectEditor } from ".";
import { Effect, type IEffectNode } from "babylonjs-editor-tools";

// don't like because it's not a good practice, but it's the only way to load the shaders
import "@babylonjs/core/Particles/particleSystemComponent";
import "@babylonjs/core/Shaders/particles.vertex";
import "@babylonjs/core/Shaders/particles.fragment";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";

export interface IEffectEditorPreviewProps {
	filePath: string | null;
	onSceneReady?: (scene: Scene) => void;
	editor?: IEffectEditor;
	selectedNodeId?: string | number | null;
}

export interface IEffectEditorPreviewState {
	playing: boolean;
}

export class EffectEditorPreview extends Component<IEffectEditorPreviewProps, IEffectEditorPreviewState> {
	public engine: Engine | null = null;
	public scene: Scene | null = null;
	public camera: ArcRotateCamera | null = null;

	private _canvasRef: HTMLCanvasElement | null = null;
	private _renderLoopId: number = -1;

	public constructor(props: IEffectEditorPreviewProps) {
		super(props);

		this.state = {
			playing: false,
		};
	}

	public render(): ReactNode {
		return (
			<div className="relative w-full h-full">
				<canvas ref={(r) => this._onGotCanvasRef(r!)} className="w-full h-full outline-none" />

				{/* Play/Stop/Restart buttons - only show if a node is selected */}
				{this.props.selectedNodeId && (
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
				)}
			</div>
		);
	}

	public componentDidMount(): void {
		// Canvas ref will be set in render, _onGotCanvasRef will be called automatically
		// Sync playing state with effect state
		this._syncPlayingState();
	}

	private _syncPlayingState(): void {
		if (!this.props.selectedNodeId) {
			// No node selected, hide buttons
			if (this.state.playing) {
				this.setState({ playing: false });
			}
			return;
		}

		const nodeData = this.props.editor?.graph?.getNodeData(this.props.selectedNodeId);
		if (!nodeData) {
			if (this.state.playing) {
				this.setState({ playing: false });
			}
			return;
		}

		// Find the effect that contains this node
		const effect = this._findEffectForNode(nodeData);
		if (!effect) {
			if (this.state.playing) {
				this.setState({ playing: false });
			}
			return;
		}

		// Check if this is an effect root node
		const isEffectRoot = this._isEffectRootNode(nodeData);
		if (isEffectRoot) {
			// For effect root, check if entire effect is started
			const isStarted = effect.isStarted();
			if (this.state.playing !== isStarted) {
				this.setState({ playing: isStarted });
			}
		} else {
			// For group or system, check if node is started
			const isStarted = effect.isNodeStarted(nodeData);
			if (this.state.playing !== isStarted) {
				this.setState({ playing: isStarted });
			}
		}
	}

	/**
	 * Find the effect that contains the given node
	 */
	private _findEffectForNode(node: IEffectNode): Effect | null {
		const effects = this.props.editor?.graph?.getAllEffects() || [];
		for (const effect of effects) {
			// Check if node is part of this effect's hierarchy
			if (this._isNodeInEffect(node, effect)) {
				return effect;
			}
		}
		return null;
	}

	/**
	 * Check if node is part of effect's hierarchy
	 */
	private _isNodeInEffect(node: IEffectNode, effect: Effect): boolean {
		if (!effect.root) {
			return false;
		}

		const findNode = (current: IEffectNode): boolean => {
			if (current === node || current.uuid === node.uuid || current.name === node.name) {
				return true;
			}
			for (const child of current.children) {
				if (findNode(child)) {
					return true;
				}
			}
			return false;
		};

		return findNode(effect.root);
	}

	/**
	 * Check if node is an effect root node
	 */
	private _isEffectRootNode(node: IEffectNode): boolean {
		if (!node.uuid) {
			return false;
		}

		// Check if this node's UUID matches an effect ID (effect root has effect ID as uuid)
		const effects = this.props.editor?.graph?.getAllEffects() || [];
		for (const effect of effects) {
			if (effect.root && effect.root.uuid === node.uuid) {
				return true;
			}
		}
		return false;
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

		// Notify parent that scene is ready
		this.props.onSceneReady?.(this.scene);

		this.forceUpdate();
	}

	private _handlePlayStop(): void {
		if (!this.props.selectedNodeId) {
			return;
		}

		const nodeData = this.props.editor?.graph?.getNodeData(this.props.selectedNodeId);
		if (!nodeData) {
			return;
		}

		const effect = this._findEffectForNode(nodeData);
		if (!effect) {
			return;
		}

		// Check if this is an effect root node
		const isEffectRoot = this._isEffectRootNode(nodeData);
		if (isEffectRoot) {
			// For effect root, manage entire effect
			if (effect.isStarted()) {
				effect.stop();
			} else {
				effect.start();
			}
		} else if (effect.isNodeStarted(nodeData)) {
			// For group or system, manage only this node
			effect.stopNode(nodeData);
		} else {
			effect.startNode(nodeData);
		}

		this._syncPlayingState();
	}

	private _handleRestart(): void {
		if (!this.props.selectedNodeId) {
			return;
		}

		const nodeData = this.props.editor?.graph?.getNodeData(this.props.selectedNodeId);
		if (!nodeData) {
			return;
		}

		const effect = this._findEffectForNode(nodeData);
		if (!effect) {
			return;
		}

		// Check if this is an effect root node
		const isEffectRoot = this._isEffectRootNode(nodeData);
		if (isEffectRoot) {
			// For effect root, restart entire effect
			effect.reset();
			effect.start();
		} else {
			// For group or system, restart only this node
			effect.resetNode(nodeData);
			effect.startNode(nodeData);
		}

		this.setState({ playing: true });
	}

	public componentDidUpdate(prevProps: IEffectEditorPreviewProps): void {
		// Sync playing state when selected node changes or when props change
		if (prevProps.selectedNodeId !== this.props.selectedNodeId) {
			this._syncPlayingState();
		} else {
			// Update playing state based on actual node state
			this._syncPlayingState();
		}
	}
}
