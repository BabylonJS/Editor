import { Component, ReactNode } from "react";
import { Editor } from "../../main";
import { Camera } from "babylonjs";
import { EditorPreview } from "../preview";

export interface ICameraPreviewProps {
    editor: Editor;
    camera: Camera | null;
}

export interface ICameraPreviewState {
    isRendering: boolean;
}

export class CameraPreview extends Component<ICameraPreviewProps, ICameraPreviewState> {
	/**
	 * Defines the reference to the preview component that owns this camera preview.
	 */
	private readonly _preview: EditorPreview;

	private _camera: Camera | null;
	private _canvasRef: HTMLCanvasElement | null = null;
	private _view: any = null;

	public constructor(props: ICameraPreviewProps) {
		super(props);

		this._preview = props.editor.layout.preview;
		this._camera = props.camera;
		this.state = {
			isRendering: false,
		};
	}

	public render(): ReactNode {
		if (!this._camera) {
			return (
				<div className="w-full h-full flex items-center justify-center text-muted-foreground">
					No camera selected
				</div>
			);
		}

		return (
			<div className="relative w-full h-full">
				<canvas
					ref={(r) => this._onCanvasRef(r!)}
					className="w-full h-full select-none outline-none bg-background"
				/>
				{this._camera && (
					<div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
						{this._camera.name}
					</div>
				)}
			</div>
		);
	}

	public componentWillUnmount(): void {
		this.dispose();
	}

	public componentDidUpdate(prevProps: ICameraPreviewProps): void {
		if (prevProps.camera !== this.props.camera) {
			this._camera = this.props.camera;
			this._updateCamera();
		}
	}

	public setCamera(camera: Camera | null): void {
		if (this._camera === camera) {
			return;
		}

		this._camera = camera;
		this.forceUpdate();
		this._updateCamera();
	}

	/**
	 * Sets up the camera preview using Babylon.js Views API
	 * Based on: https://doc.babylonjs.com/features/featuresDeepDive/scene/multiCanvas
	 */
	private _setupCameraPreview(): void {
		if (!this._camera || !this._canvasRef || !this._preview.engine) {
			return;
		}

		if (!this._view) {
			const engine = this._preview.engine;
			this._view = engine.registerView(this._canvasRef, this._camera);    
			this.setState({ isRendering: true });
		}
	}

	/**
	 * Updates the camera for existing view
	 */
	private _updateCamera(): void {
		if (!this._camera || !this._view || !this._preview.engine) {
			return;
		}

		this._view.camera = this._camera;
	}

	/**
	 * Disposes all resources
	 */
	public dispose(): void {
		if (this._view && this._canvasRef && this._preview.engine) {
			this._preview.engine.unRegisterView(this._canvasRef);
			this._view = null;
			this._camera = null;
			this._canvasRef = null;
		}

		this.setState({ isRendering: false });
	}

	/**
	 * Handles canvas reference
	 */
	private _onCanvasRef(canvas: HTMLCanvasElement): void {
		if (this._canvasRef === canvas) {
			return;
		}

		this._canvasRef = canvas;
		
		if (canvas && this._camera) {
			this._setupCameraPreview();
		}
	}
}
