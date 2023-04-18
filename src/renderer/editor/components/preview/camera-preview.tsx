import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Button } from "@blueprintjs/core";

import { Camera, Engine, Node, Observer, Viewport } from "babylonjs";

import { Editor } from "../../editor";

import { SceneSettings } from "../../scene/settings";

export interface ICameraPreviewProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
}

export interface ICameraPreviewState {
	/**
	 * Defines the reference wether or not the preview is visible.
	 */
	visible: boolean;
	/**
	 * Defines wether or not the size should be doubled.
	 */
	doubleSize: boolean;
}

export class CameraPreview extends React.Component<ICameraPreviewProps, ICameraPreviewState> {
	private _selectedNode: Nullable<Camera> = null;
	private _resizeObserver: Nullable<Observer<Engine>> = null;

	private _divElement: Nullable<HTMLDivElement> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ICameraPreviewProps) {
		super(props);

		this.state = {
			visible: false,
			doubleSize: false,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<>
				<div
					style={{
						right: "10px",
						height: "24px",
						position: "absolute",
						background: "#00000099",
						backdropFilter: "blur(50px)",
						textAlign: "center", lineHeight: "24px",
						display: this.state.visible ? "" : "none",
						bottom: this.state.doubleSize ? "410px" : "210px",
						width: this.state.doubleSize ? "800px" : "400px",
					}}
				>
					<span>Preview: {this._selectedNode?.name}</span>
					<Button text="x" small style={{ position: "absolute", right: "2px", top: "0px", borderRadius: "100%" }} onClick={() => this.clear()} />
					<Button text={this.state.doubleSize ? "[x]" : "[]"} small style={{ position: "absolute", right: "32px", top: "0px", borderRadius: "100%" }} onClick={() => this.setDoubleSized(!this.state.doubleSize)} />
				</div>
				<div
					style={{
						right: "10px",
						bottom: "10px",
						position: "absolute",
						display: this.state.visible ? "" : "none",
						width: this.state.doubleSize ? "800px" : "400px",
						height: this.state.doubleSize ? "400px" : "200px",
					}}
					ref={(r) => this._divElement = r}
					onMouseEnter={() => {
						SceneSettings.Camera?.detachControl();

						this.props.editor.engine!.inputElement = this._divElement;

						if (this._selectedNode) {
							this.props.editor.scene!.cameraToUseForPointers = this._selectedNode;
							SceneSettings.AttachControl(this.props.editor, this._selectedNode);
						}
					}}
					onMouseLeave={() => {
						this._selectedNode?.detachControl();

						this.props.editor.engine!.inputElement = null;

						if (SceneSettings.Camera) {
							this.props.editor.scene!.cameraToUseForPointers = SceneSettings.Camera;
							SceneSettings.AttachControl(this.props.editor, SceneSettings.Camera);
						}
					}}
				>
				</div>
			</>
		);
	}

	/**
	 * Sets wether or not the size of the preview should be doubled.
	 * @param doubled defines wether or not the size of the preview should be doubled.
	 */
	public setDoubleSized(doubled: boolean): void {
		this.setState({ doubleSize: doubled }, () => {
			if (this._selectedNode) {
				const node = this._selectedNode;

				this.clear();
				this.setSelectedNode(node);
			}
		});

	}

	/**
	 * Sets the selected in the editor. In case of a camera, create the preview.
	 * @param node defines the reference to the selected node in the editor.
	 */
	public setSelectedNode(node: Nullable<Node>): void {
		if (!node || !(node instanceof Camera)) {
			return;
		}

		const scene = this.props.editor.scene!;

		if (scene.activeCameras?.length) {
			if (scene.activeCameras[0] !== SceneSettings.Camera) {
				return;
			}
		} else if (scene.activeCamera !== SceneSettings.Camera) {
			return;
		}

		this.setState({ visible: true });

		this._selectedNode = node;

		scene.activeCameras = [];
		scene.activeCameras.push(SceneSettings.Camera!);
		scene.activeCameras.push(node);

		scene.activeCamera = SceneSettings.Camera;
		scene.cameraToUseForPointers = SceneSettings.Camera;

		// SceneSettings.ResetPipelines(this.props.editor);

		this._updatePreviewCameraViewport();

		const engine = this.props.editor.engine!;
		this._resizeObserver = engine.onResizeObservable.add(() => {
			this._updatePreviewCameraViewport();
		});
	}

	/**
	 * Updates the viewport of the camera used in the preview sub-panel.
	 */
	private _updatePreviewCameraViewport(): void {
		if (!this._selectedNode) {
			return;
		}

		const engine = this.props.editor.engine!;
		const canvas = engine.getRenderingCanvas();

		if (!canvas) {
			return;
		}

		const offsetX = 10 / canvas.width;
		const offsetY = 10 / canvas.height;

		const x = (canvas.width - (this.state.doubleSize ? 800 : 400)) / canvas.width;

		const width = (this.state.doubleSize ? 800 : 400) / canvas.width;
		const height = (this.state.doubleSize ? 400 : 200) / canvas.height;

		this._selectedNode.viewport = new Viewport(
			x - offsetX,
			offsetY,
			width,
			height,
		);
	}

	/**
	 * Clears all the preview allocated resources.
	 */
	public clear(): void {
		const scene = this.props.editor.scene!;
		const engine = this.props.editor.engine!;

		if (this._selectedNode) {
			scene.activeCameras = [];
			scene.activeCamera = SceneSettings.Camera;

			this._selectedNode.viewport = new Viewport(0, 0, 1, 1);
		}

		if (this._resizeObserver) {
			engine.onResizeObservable.remove(this._resizeObserver);
			this._resizeObserver = null;
		}

		this._selectedNode = null;
		this.setState({ visible: false });
	}
}
