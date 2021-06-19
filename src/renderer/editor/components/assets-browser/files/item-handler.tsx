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

	/**
	 * Defines the callback called on the item is starts being dragged.
	 */
	onDragStart: (ev: React.DragEvent<HTMLDivElement>) => void;
	/**
	 * Defines the callback caleld on the item handler wants to change the color of the title.
	 * This is useful to target assets types.
	 */
	onSetTitleColor: (color: string) => void;
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
	 * Defines the reference to the drag'n'dropped item.
	 * @hidden
	 */
	public static _DragAndDroppedItem: Nullable<AssetsBrowserItemHandler> = null;

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
	 * Called on the user drops the asset in the editor's preview canvas.
	 * @param ev defines the reference to the event object.
	 * @param pick defines the picking info generated while dropping in the preview.
	 */
	public onDropInPreview(_1: React.DragEvent<HTMLElement>, _2: PickingInfo): void {
		// Empty by default...
	}

	/**
	 * Called on the user drops the asset in a supported inspector field.
	 * @param ev defiens the reference to the event object.
	 * @param object defines the reference to the object being modified in the inspector.
	 * @param property defines the property of the object to assign the asset instance.
	 */
	public onDropInInspector(_1: React.DragEvent<HTMLElement>, _2: any, _3: string): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Called on the user starts dragging the item.
	 */
	private _handleDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		this.onDragStart(ev);

		AssetsBrowserItemHandler._DragAndDroppedItem = this;

		this.props.editor.engine?.getRenderingCanvas()?.addEventListener("drop", this._dropListener = (dropEv) => {
			const scene = this.props.editor.scene!;
			const pick = scene.pick(dropEv.offsetX, dropEv.offsetY) ?? new PickingInfo();

			this.onDropInPreview(ev, pick);
		});

		this.props.onDragStart(ev);
	}

	/**
	 * Called on the user ended dragging the item.
	 */
	private _handleDragEnd(_: React.DragEvent<HTMLDivElement>): void {
		AssetsBrowserItemHandler._DragAndDroppedItem = null;

		if (this._dropListener) {
			this.props.editor.engine!.getRenderingCanvas()?.removeEventListener("drop", this._dropListener);
			this._dropListener = null;
		}
	}
}
