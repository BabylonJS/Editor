import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { PickingInfo } from "babylonjs";

import { Editor } from "../../../editor";

import { IWorkerConfiguration, Workers } from "../../../workers/workers";

export interface IAssetsBrowserItemHandlerProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the relative path to the item.
	 */
	relativePath: string;
	/**
	 * Defines the absolute path to the item.
	 */
	absolutePath: string;
}

export interface IAssetsBrowserItemHandlerState {
	/**
	 * Defines the reference to the preview image to be drawn in the item.
	 */
	previewImage: Nullable<React.ReactNode>;
}

export interface IItemHandler {
	/**
	 * Defines the extension supported by the handler.
	 */
	extension: string;
	/**
	 * Defines the function called each time an asset that matches the extension
	 * is being added to the items list of the assets component.
	 */
	ctor: (new (props: IAssetsBrowserItemHandlerProps) => AssetsBrowserItemHandler);
}

export abstract class AssetsBrowserItemHandler extends React.Component<IAssetsBrowserItemHandlerProps, IAssetsBrowserItemHandlerState> {
	/**
	 * Defines the reference to the assets worker.
	 */
	public static AssetWorker: IWorkerConfiguration;

	/**
	 * Initialzes the item handler.
	 */
	public static async Init(): Promise<void> {
		const canvas = document.createElement("canvas");
		canvas.width = 100;
		canvas.height = 100;

		const offscreen = canvas.transferControlToOffscreen();

		this.AssetWorker = await Workers.LoadWorker("assets.js", offscreen);
	}

	private _dropListener: Nullable<(ev: DragEvent) => void> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserItemHandlerProps) {
		super(props);

		this.state = {
			previewImage: null,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div
				onDragEnd={(ev) => this._handleDragEnd(ev)}
				onDoubleClick={(ev) => this.onDoubleClick(ev)}
				onContextMenu={(ev) => this.onContextMenu(ev)}
				onDragStart={(ev) => this._handleDragStart(ev)}
				style={{
					width: "100%",
					height: "100%",
				}}
			>
				{this.state.previewImage}
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		const previewImage = await this.computePreview();
		if (previewImage) {
			this.setState({ previewImage });
		}
	}

	/**
	 * Computes the image to render as a preview.
	 */
	public abstract computePreview(): React.ReactNode | Promise<React.ReactNode>;

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		// Empty by default...
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		// Empty by default...
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(_: React.DragEvent<HTMLDivElement>): void {
		// Empty by default...
	}

	/**
	 * Called on the 
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public onDropInPreview(_: React.DragEvent<HTMLDivElement>, __: PickingInfo): void {
		// Empty by default...
	}

	/**
	 * Called on the user starts dragging the item.
	 */
	private _handleDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		this.onDragStart(ev);

		this.props.editor.engine?.getRenderingCanvas()?.addEventListener("drop", this._dropListener = () => {
			const scene = this.props.editor.scene!;
			const pick = scene.pick(scene.pointerX, scene.pointerY) ?? new PickingInfo();

			this.onDropInPreview(ev, pick);
		});
	}

	/**
	 * Called on the user ended dragging the item.
	 */
	private _handleDragEnd(ev: React.DragEvent<HTMLDivElement>): void {
		if (this._dropListener) {
			this.props.editor.engine!.getRenderingCanvas()?.removeEventListener("drop", this._dropListener);
			this._dropListener = null;
		}

		ev.dataTransfer.clearData();
	}
}
