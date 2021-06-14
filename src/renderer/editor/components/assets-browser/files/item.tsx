import { extname } from "path";

import { IStringDictionary, Nullable } from "../../../../../shared/types";

import * as React from "react";
import { Position, Tooltip } from "@blueprintjs/core";

import { Editor } from "../../../editor";

import { AssetsBrowserItemHandler, IItemHandler, IAssetsBrowserItemHandlerProps } from "./item-handler";

import { FileItemHandler } from "./handlers/file";
import { MeshItemHandler } from "./handlers/mesh";
import { ImageItemHandler } from "./handlers/image";
import { MaterialItemHandler } from "./handlers/material";
import { DirectoryItemHandler } from "./handlers/directory";

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
	 * Callback called on the user double clicks an item.
	 */
	onDoubleClick: () => void;
}

export interface IAssetsBrowserItemState {
	/**
	 * Defines the reference to the item handler.
	 */
	itemHandler: Nullable<React.ReactNode>;
}

export class AssetsBrowserItem extends React.Component<IAssetsBrowserItemProps, IAssetsBrowserItemState> {
	private static _ItemHandlers: IStringDictionary<IItemHandler> = {};

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
	 * Initializes the item renderer.
	 */
	public static Init(): void {
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
	}

	private _mainDiv: Nullable<HTMLDivElement> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserItemProps) {
		super(props);

		this.state = {
			itemHandler: null,
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
				onDoubleClick={() => this.props.onDoubleClick()}
				style={{
					width: "100px",
					height: "100px",
					margin: "10px 10px",
					textAlign: "center",
					outlineWidth: "3px",
					position: "relative",
					outlineColor: "#48aff0",
					backgroundColor: "#222222",
				}}
			>
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
				<Tooltip key="item-tooltip" content={this.props.title} usePortal={true} position={Position.TOP}>
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
						}}
					>
						{this.props.title}
					</small>
				</Tooltip>
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
				/>
			)
		});
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
		if (this._mainDiv) {
			this._mainDiv.style.outlineStyle = "unset";
		}
	}

	/**
	 * Called on the user drops something on the item.
	 */
	private _handleDrop(ev: React.DragEvent<HTMLDivElement>): void {
		debugger;
		console.log(ev);

		if (this.props.type !== "directory") {
			return;
		}
	}
}
