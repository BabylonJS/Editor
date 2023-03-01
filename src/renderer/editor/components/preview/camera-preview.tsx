import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Camera, Node, Observer, RenderTargetTexture } from "babylonjs";

import { Editor } from "../../editor";
import { Button } from "@blueprintjs/core";

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
	private _canvas: Nullable<HTMLCanvasElement> = null;
	private _renderTarget: Nullable<RenderTargetTexture> = null;
	private _viewMatrixChangeObserver: Nullable<Observer<Camera>> = null;
	private _projectionMatrixChangeObserver: Nullable<Observer<Camera>> = null;

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
					<Button text="x" small style={{ position: "absolute", right: "2px", top: "0px", borderRadius: "100%" }} onClick={() => this._clear()} />
					<Button text={this.state.doubleSize ? "[x]" : "[]"} small style={{ position: "absolute", right: "32px", top: "0px", borderRadius: "100%" }} onClick={() => this.setDoubleSized(!this.state.doubleSize)} />
				</div>
				<div
					style={{
						right: "10px",
						bottom: "10px",
						position: "absolute",
						pointerEvents: "none",
						background: "#00000099",
						backdropFilter: "blur(50px)",
						display: this.state.visible ? "" : "none",
						width: this.state.doubleSize ? "800px" : "400px",
						height: this.state.doubleSize ? "400px" : "200px",
					}}
				>
					<canvas ref={(r) => this._canvas = r} style={{ width: "100%", height: "100%", transform: "scale(1, -1)", objectFit: "contain", pointerEvents: "none" }} />
				</div>
			</>
		);
	}

	/**
	 * Sets wether or not the size of the preview should be doubled.
	 * @param doubled defines wether or not the size of the preview should be doubled.
	 */
	public setDoubleSized(doubled: boolean): void {
		this.setState({ doubleSize: doubled });

		if (this._selectedNode) {
			const node = this._selectedNode;

			this._clear();
			this.setSelectedNode(node);
		}
	}

	/**
	 * Sets the selected in the editor. In case of a camera, create the preview.
	 * @param node defines the reference to the selected node in the editor.
	 */
	public setSelectedNode(node: Node): void {
		if (!(node instanceof Camera)) {
			return;
		}

		this.setState({ visible: true });

		this._selectedNode = node;

		this._renderTarget = new RenderTargetTexture("camera_preview_rtt", this.state.doubleSize ? { width: 800, height: 400 } : { width: 400, height: 200 }, this.props.editor.scene!, true, true);
		this._renderTarget.refreshRate = 0;
		this._renderTarget.activeCamera = node;
		this._renderTarget.useCameraPostProcesses = false;
		this._renderTarget.renderList = this.props.editor.scene!.meshes.slice();

		this.props.editor.scene!.customRenderTargets.push(this._renderTarget);

		const c = this._canvas?.getContext("2d");
		if (!c) {
			return;
		}

		let computing = false;
		let firstRender = true;
		let buffer = new Uint8Array();

		this._viewMatrixChangeObserver = node.onViewMatrixChangedObservable.add(() => {
			this._renderTarget!.refreshRate = 0;
		});

		this._projectionMatrixChangeObserver = node.onProjectionMatrixChangedObservable.add(() => {
			this._renderTarget!.refreshRate = 0;
		});

		this._renderTarget.onAfterRenderObservable.add(async () => {
			if (computing) {
				return;
			}

			computing = true;

			const renderWidth = this.props.editor.engine!.getRenderWidth();
			const renderHeight = this.props.editor.engine!.getRenderHeight();

			const { width, height } = this._renderTarget!.getSize();

			if (width !== this.props.editor.engine!.getRenderWidth() || height !== this.props.editor.engine!.getRenderHeight()) {
				this._renderTarget!.resize({ width: renderWidth, height: renderHeight });
			}

			if (c.canvas.width !== width || c.canvas.height !== height) {
				c.canvas.width = width;
				c.canvas.height = height;
			}

			const count = width * height * 4;
			if (buffer.length !== count) {
				buffer = new Uint8Array(count);
			}

			try {
				const p = await this._renderTarget!.readPixels(0, 0, buffer, true, true) as Uint8Array;
				const a = new ImageData(new Uint8ClampedArray(p), width, height);

				c.scale(1, -1);
				c.putImageData(a, 0, 0);
			} catch (e) {
				// Catch silently.
			}

			computing = false;

			if (firstRender) {
				firstRender = false;
				this._renderTarget!.refreshRate = 0;
			}
		});
	}

	/**
	 * Clears all the preview allocated resources.
	 */
	private _clear(): void {
		if (this._renderTarget) {
			this._renderTarget?.dispose();
			this._renderTarget = null;
		}

		if (this._selectedNode) {
			this._selectedNode.onViewMatrixChangedObservable.remove(this._viewMatrixChangeObserver);
			this._selectedNode.onProjectionMatrixChangedObservable.remove(this._projectionMatrixChangeObserver);

			this._viewMatrixChangeObserver = null;
			this._projectionMatrixChangeObserver = null;
		}

		this._selectedNode = null;
		this.setState({ visible: false });
	}
}
