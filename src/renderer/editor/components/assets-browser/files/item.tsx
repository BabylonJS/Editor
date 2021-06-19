import { join, dirname, extname } from "path";

import { IStringDictionary, Nullable } from "../../../../../shared/types";

import * as React from "react";
import { Classes, Position, Tooltip } from "@blueprintjs/core";

import { Editor } from "../../../editor";

import { EditableText } from "../../../gui/editable-text";

import { AssetsBrowserItemHandler, IItemHandler, IAssetsBrowserItemHandlerProps } from "./item-handler";

import { FileItemHandler } from "./handlers/file";
import { MeshItemHandler } from "./handlers/mesh";
import { SoundItemHandler } from "./handlers/mp3";
import { EnvDdsItemHandler } from "./handlers/env";
import { ImageItemHandler } from "./handlers/image";
import { TypeScriptItemHandler } from "./handlers/ts";
import { MaterialItemHandler } from "./handlers/material";
import { DirectoryItemHandler } from "./handlers/directory";

import { AssetsBrowserMeshMoveHandler } from "./move/mesh";
import { AssetsBrowserSoundMoveHandler } from "./move/sound";
import { AssetsBrowserMoveHandler } from "./move/move-handler";
import { AssetsBrowserTypeScriptMoveHandler } from "./move/ts";
import { AssetsBrowserTextureMoveHandler } from "./move/texture";
import { AssetsBrowserMaterialMoveHandler } from "./move/material";

export interface IAssetsBrowserItemProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the title of the item.
	 */
	title: string;
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
	 * Defines the callback called each time the item is clicked.
	 */
	onClick: (item: AssetsBrowserItem, ev: React.MouseEvent<HTMLDivElement>) => void;
	/**
	 * Callback called on the user double clicks an item.
	 */
	onDoubleClick: () => void;
	/**
	 * Defines the callback called on the item is starts being dragged.
	 */
	onDragStart: (item: AssetsBrowserItem, ev: React.DragEvent<HTMLDivElement>) => void;
}

export interface IAssetsBrowserItemState {
	/**
	 * Defines the color applied on the title.
	 */
	titleColor: string;
	/**
	 * Defines wether or not the item is selected.
	 */
	isSelected: boolean;
	/**
	 * Defines wether or not the file is being renamed.
	 */
	isRenaming: boolean;
	/**
	 * Defines the reference to the item handler.
	 */
	itemHandler: Nullable<React.ReactNode>;
}

export class AssetsBrowserItem extends React.Component<IAssetsBrowserItemProps, IAssetsBrowserItemState> {
	/**
	 * @hidden
	 */
	public static _ItemHandlers: IStringDictionary<IItemHandler> = {};
	/**
	 * @hidden
	 */
	public static _ItemMoveHandlers: AssetsBrowserMoveHandler[] = [];

	/**
	 * Registers the given item handler.
	 * @param itemHandler defines the reference to the configuration of the item handler.
	 */
	public static RegisterItemHandler(itemHandler: IItemHandler): void {
		if (this._ItemHandlers[itemHandler.extension]) {
			return;
		}

		this._ItemHandlers[itemHandler.extension] = itemHandler;
	}

	/**
	 * Registers the given item move handler.
	 * @param itemMoveHandler defines the reference to the item move handler.
	 */
	public static RegisterItemMoveHandler(itemMoveHandler: AssetsBrowserMoveHandler): void {
		if (this._ItemMoveHandlers.indexOf(itemMoveHandler) !== -1) {
			return;
		}

		this._ItemMoveHandlers.push(itemMoveHandler);
	}

	/**
	 * Initializes the item renderer.
	 */
	public static Init(editor: Editor): void {
		// Item handlers
		this.RegisterItemHandler({ extension: ".png", ctor: ImageItemHandler });
		this.RegisterItemHandler({ extension: ".bmp", ctor: ImageItemHandler });
		this.RegisterItemHandler({ extension: ".jpg", ctor: ImageItemHandler });
		this.RegisterItemHandler({ extension: ".jpeg", ctor: ImageItemHandler });

		this.RegisterItemHandler({ extension: ".fbx", ctor: MeshItemHandler });
		this.RegisterItemHandler({ extension: ".babylon", ctor: MeshItemHandler });
		this.RegisterItemHandler({ extension: ".stl", ctor: MeshItemHandler });
		this.RegisterItemHandler({ extension: ".obj", ctor: MeshItemHandler });
		this.RegisterItemHandler({ extension: ".gltf", ctor: MeshItemHandler });
		this.RegisterItemHandler({ extension: ".glb", ctor: MeshItemHandler });

		this.RegisterItemHandler({ extension: ".material", ctor: MaterialItemHandler });

		this.RegisterItemHandler({ extension: ".env", ctor: EnvDdsItemHandler });
		this.RegisterItemHandler({ extension: ".dds", ctor: EnvDdsItemHandler });

		this.RegisterItemHandler({ extension: ".ts", ctor: TypeScriptItemHandler });

		this.RegisterItemHandler({ extension: ".mp3", ctor: SoundItemHandler });
		this.RegisterItemHandler({ extension: ".wav", ctor: SoundItemHandler });
		this.RegisterItemHandler({ extension: ".wave", ctor: SoundItemHandler });
		this.RegisterItemHandler({ extension: ".ogg", ctor: SoundItemHandler });

		// Move handlers
		this.RegisterItemMoveHandler(new AssetsBrowserMeshMoveHandler(editor));
		this.RegisterItemMoveHandler(new AssetsBrowserSoundMoveHandler(editor));
		this.RegisterItemMoveHandler(new AssetsBrowserTextureMoveHandler(editor));
		this.RegisterItemMoveHandler(new AssetsBrowserMaterialMoveHandler(editor));
		this.RegisterItemMoveHandler(new AssetsBrowserTypeScriptMoveHandler(editor));
	}

	private _mainDiv: Nullable<HTMLDivElement> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserItemProps) {
		super(props);

		this.state = {
			isSelected: false,
			isRenaming: false,
			itemHandler: null,
			titleColor: "#ffffff",
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div
				ref={(r) => this._mainDiv = r}
				onDrop={(ev) => this._handleDrop(ev)}
				onMouseOver={() => this._handleMouseOver()}
				onMouseLeave={() => this._handleMouseLeave()}
				onDragOver={(ev) => this._handleDragOver(ev)}
				onDragLeave={(ev) => this._handleDragLeave(ev)}

				onClick={(ev) => this.props.onClick(this, ev)}
				onDoubleClick={() => this.props.onDoubleClick()}

				onContextMenu={(ev) => ev.stopPropagation()}

				style={{
					width: "100px",
					height: "100px",
					margin: "10px 10px",
					textAlign: "center",
					outlineWidth: "3px",
					position: "relative",
					outlineColor: "#48aff0",
					backgroundColor: "#222222",
					outlineStyle: this.state.isSelected ? "groove" : "unset",
				}}
			>
				<Tooltip key="item-tooltip" content={this.props.title} usePortal={true} position={Position.TOP}>
					<div
						key="render-image"
						style={{
							margin: "auto",
							width: "calc(100% - 20px)",
							height: "calc(100% - 20px)",
						}}
					>
						{this.state.itemHandler}
					</div>
				</Tooltip>
				{this.state.isRenaming ? this._getTitleEditableText() : this._getTitle()}
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		let handler: { itemHandler?: (new (props: IAssetsBrowserItemHandlerProps) => AssetsBrowserItemHandler); } = {
			itemHandler: undefined,
		};

		if (this.props.type === "directory") {
			handler.itemHandler = DirectoryItemHandler;
		} else {
			const extension = extname(this.props.absolutePath).toLowerCase();
			handler.itemHandler = AssetsBrowserItem._ItemHandlers[extension]?.ctor;
		}

		if (!handler.itemHandler) {
			handler.itemHandler = FileItemHandler;
		}

		this.setState({
			itemHandler: (
				<handler.itemHandler
					editor={this.props.editor}
					relativePath={this.props.relativePath}
					absolutePath={this.props.absolutePath}
					onDragStart={(ev) => this.props.onDragStart(this, ev)}
					onSetTitleColor={(c) => this.setState({ titleColor: c })}
				/>
			)
		});
	}

	/**
	 * Sets wether or not the item is selected.
	 * @param isSelected defines wether or not the item is selected.
	 */
	public setSelected(isSelected: boolean): void {
		this.setState({ isSelected });
	}

	/**
	 * Called on the mouse pointer enters over the item.
	 */
	private _handleMouseOver(): void {
		if (this._mainDiv) {
			this._mainDiv.style.outlineStyle = "groove";
		}
	}

	/**
	 * Called on the mouse pointer is not over the item anymore.
	 */
	private _handleMouseLeave(): void {
		if (!this.state.isSelected && this._mainDiv) {
			this._mainDiv.style.outlineStyle = "unset";
		}
	}

	/**
	 * Called on the user drag's an object over the item.
	 */
	private _handleDragOver(_: React.DragEvent<HTMLDivElement>): void {
		if (this.props.type !== "directory") {
			return;
		}

		if (this._mainDiv) {
			this._mainDiv.style.backgroundColor = "rgba(0, 0, 0, 1)";
		}
	}

	/**
	 * Called on the user stopped dragging an object over the item.
	 */
	private _handleDragLeave(_: React.DragEvent<HTMLDivElement>): void {
		if (this.props.type !== "directory") {
			return;
		}

		if (this._mainDiv) {
			this._mainDiv.style.backgroundColor = "#222222";
		}
	}

	/**
	 * Called on the user drops something on the item.
	 */
	private async _handleDrop(_: React.DragEvent<HTMLDivElement>): Promise<void> {
		if (this.props.type !== "directory") {
			return;
		}

		if (this._mainDiv) {
			this._mainDiv.style.backgroundColor = "#222222";
		}

		this.props.editor.assetsBrowser.moveSelectedItems(this.props.absolutePath);
	}


	/**
	 * Returns the title node for the item.
	 */
	private _getTitle(): React.ReactNode {
		return (
			<small
				key="item-title"
				style={{
					left: "0px",
					bottom: "0px",
					width: "100px",
					overflow: "hidden",
					userSelect: "none",
					whiteSpace: "nowrap",
					position: "absolute",
					textOverflow: "ellipsis",
					color: this.state.titleColor,
				}}
				onDoubleClick={(ev) => {
					ev.stopPropagation();
					this.setState({ isRenaming: true });
				}}
			>
				{this.props.title}
			</small>
		);
	}

	/**
	 * Returns the editable text node used to rename file or folder.
	 */
	private _getTitleEditableText(): React.ReactNode {
		return (
			<EditableText
				intent="primary"
				confirmOnEnterKey
				selectAllOnFocus
				multiline={false}
				ref={(r) => r?.focus()}
				className={Classes.FILL}
				value={this.props.title}
				onConfirm={(v) => {
					this.setState({ isRenaming: false });
					if (v === this.props.title) {
						return;
					}

					if (this.props.type === "directory") {
						const destination = dirname(join(dirname(this.props.absolutePath), v));
						const renamingFolder = this.props.type === "directory" ? v : undefined;
						this.props.editor.assetsBrowser.moveSelectedItems(destination, [this.props.absolutePath], renamingFolder);
					} else {
						this.props.editor.assetsBrowser.renameFile(this.props.absolutePath, v);
					}
				}}
			/>
		);
	}
}
