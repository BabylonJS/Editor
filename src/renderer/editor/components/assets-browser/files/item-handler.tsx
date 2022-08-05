import { platform } from "os";
import { basename } from "path";
import { shell } from "electron";

import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { MenuItem, Icon as BPIcon, MenuDivider } from "@blueprintjs/core";

import { PickingInfo } from "babylonjs";

import { Editor } from "../../../editor";

import { Tools } from "../../../tools/tools";

import { Alert } from "../../../gui/alert";
import { Confirm } from "../../../gui/confirm";

import { InspectorNotifier } from "../../../gui/inspector/notifier";

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
	 * Defines the type of the item (directory or file).
	 */
	type: "file" | "directory";

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
				onClick={(ev) => this.onClick(ev)}
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
	 * Called on the user clicks on the asset.
	 * @param ev defines the reference to the event object.
	 */
	public onClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		// Empty by default...
	}

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
	public onDropInPreview(_1: DragEvent, _2: PickingInfo): void {
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
	 * Called on the user drops the asset in the editor's graph.
	 * @param ev defines the reference to the event object.
	 * @param objects defines the reference to the array of objects selected in the graph.
	 */
	public onDropInGraph(_1: React.DragEvent<HTMLElement>, _2: any[]): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * Returns the list of all common context menu items.
	 */
	protected getCommonContextMenuItems(): React.ReactNode[] {
		const isMacOs = platform() === "darwin";
		const assetType = this.props.type === "directory" ? "directory" : "asset";

		return [
			<MenuItem
				icon={<BPIcon icon="document-open" color="white" />}
				text={`Reveal in ${isMacOs ? "Finder" : "Explorer"}`}
				onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(this.props.absolutePath))}
			/>,
			<MenuDivider />,
			<MenuItem
				icon={<BPIcon icon="trash" color="white" />}
				onClick={() => this._handleMoveToTrash()}
				text={`Move ${this.props.editor.assetsBrowser.selectedFiles.length > 1 ? `Selected ${assetType}` : assetType} to trash...`}
			/>,
		];
	}

	/**
	 * Called on the user wants to move the item to trash.
	 */
	private async _handleMoveToTrash(): Promise<void> {
		const multipleFiles = this.props.editor.assetsBrowser.selectedFiles.length > 1;

		const confirm = await Confirm.Show(
			`Move ${multipleFiles ? "Selected Assets" : "Asset"} To Trash?`,
			`Are you sure to move the ${multipleFiles ? "selected assets" : `asset "${basename(this.props.relativePath)}"`} to trash? If yes, all linked elements in the scene will be reset`,
		);

		if (!confirm) {
			return;
		}

		const result = await this.props.editor.assetsBrowser.moveSelectedItemsToTrash(false);
		if (result.length) {
			Alert.Show("Failed To Move Asset(s) To Trash", `Failed to move some assets to trash.`);
		}

		await this.props.editor.assetsBrowser.refresh();
		await this.props.editor.assets.forceRefresh();
	}

	/**
	 * Called on the user starts dragging the item.
	 */
	private _handleDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		this.onDragStart(ev);

		InspectorNotifier._DragAndDroppedAssetItem = this;

		ev.dataTransfer.setDragImage(new Image(), 0, 0);

		this.props.editor.engine?.getRenderingCanvas()?.addEventListener("drop", this._dropListener = (dropEv) => {
			const scene = this.props.editor.scene!;
			const pick = scene.pick(dropEv.offsetX, dropEv.offsetY) ?? new PickingInfo();

			this.onDropInPreview(dropEv, pick);
		});

		this.props.onDragStart(ev);
	}

	/**
	 * Called on the user ended dragging the item.
	 */
	private _handleDragEnd(_: React.DragEvent<HTMLDivElement>): void {
		InspectorNotifier._DragAndDroppedAssetItem = null;

		if (this._dropListener) {
			this.props.editor.engine!.getRenderingCanvas()?.removeEventListener("drop", this._dropListener);
			this._dropListener = null;
		}
	}
}
