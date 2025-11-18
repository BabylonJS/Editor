import { platform } from "os";
import { readdir, rename, stat } from "fs-extra";
import { basename, extname, dirname, join } from "path/posix";

import { ipcRenderer } from "electron";

import { Component, DragEvent, MouseEvent, ReactNode, Fragment, KeyboardEvent } from "react";

import { Tooltip } from "@blueprintjs/core";

import { Grid } from "react-loader-spinner";

import { toast } from "sonner";

import { ImFinder } from "react-icons/im";
import { BiSolidFileCss } from "react-icons/bi";
import { GiCeilingLight } from "react-icons/gi";
import { GrStatusUnknown } from "react-icons/gr";
import { BsFiletypeMp3, BsFiletypeWav } from "react-icons/bs";
import { AiFillFileMarkdown, AiOutlineClose } from "react-icons/ai";
import { SiBabylondotjs, SiDotenv, SiJavascript, SiTypescript } from "react-icons/si";

import { FolderIcon } from "@heroicons/react/20/solid";

import { EXRIcon } from "../../../../ui/icons/exr";
import { Input } from "../../../../ui/shadcn/ui/input";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "../../../../ui/shadcn/ui/context-menu";

import { isDarwin } from "../../../../tools/os";

import { Editor } from "../../../main";

export interface IAssetsBrowserItemProps {
	/**
	 * The editor reference.
	 */
	editor: Editor;
	/**
	 * The absolute path of the item.
	 */
	absolutePath: string;

	/**
	 * Defines wether or not the item is selected.
	 */
	selected: boolean;
	/**
	 * Defines the key used to identify the item in the selectable context.
	 */
	selectableKey: string;

	/**
	 * Called on click.
	 * @param event defines the mouse event.
	 * @param item the item that has been clicked.
	 * @param contextMenu defines whether or not the context menu has been triggered.
	 */
	onClick: (event: MouseEvent<HTMLDivElement, globalThis.MouseEvent>, item: AssetsBrowserItem, contextMenu: boolean) => void;
	/**
	 * Called on double click.
	 * @param item the item that has been double clicked.
	 */
	onDoubleClick: (item: AssetsBrowserItem) => void;

	/**
	 * Called on the item asks for a refresh.
	 */
	onRefresh: () => void;
	/**
	 * Called on the item wants to control the state of the selectable context.
	 */
	setSelectionEnabled: (enabled: boolean) => void;
}

export interface IAssetsBrowserItemState {
	/**
	 * Defines whether or not the item is loading.
	 */
	isLoading: boolean;
	/**
	 * Defines whether or not the item is a directory.
	 */
	isDirectory: boolean;
	/**
	 * Defines whether or not the item is being renamed.
	 */
	isRenaming: boolean;

	/**
	 * Defines wether or not a file is being dragged over the current item (if directory).
	 */
	isDragOver: boolean;

	/**
	 * Defines the optional preview image.
	 */
	previewImage: string | null;
}

export class AssetsBrowserItem extends Component<IAssetsBrowserItemProps, IAssetsBrowserItemState> {
	private _renameValue: string = "";

	public constructor(props: IAssetsBrowserItemProps) {
		super(props);

		this.state = {
			isLoading: true,
			isRenaming: false,
			isDirectory: false,

			isDragOver: false,

			previewImage: null,
		};
	}

	public render(): ReactNode {
		const icon = this.getIcon();

		return (
			<Tooltip position="bottom" content={basename(this.props.absolutePath)} disabled={this.state.isRenaming}>
				<ContextMenu>
					<ContextMenuTrigger>
						<div
							tabIndex={0}
							draggable={!this.state.isRenaming}
							onKeyUp={(ev) => this._handleKeyUp(ev)}
							onDrop={(ev) => this._handleDrop(ev)}
							onDragStart={(ev) => this._handleDragStart(ev)}
							onDragOver={(ev) => {
								ev.preventDefault();

								if (this.state.isDirectory && ev.dataTransfer.types.includes("assets")) {
									this.setState({
										isDragOver: true,
									});
								}
							}}
							onDragLeave={() => {
								this.setState({
									isDragOver: false,
								});
							}}
							onClick={(ev) => {
								ev.stopPropagation();

								if (!this.state.isLoading && !this.state.isRenaming) {
									this.props.onClick(ev, this, false);
								}
							}}
							onContextMenu={(ev) => !this.state.isLoading && !this.state.isRenaming && this.props.onClick(ev, this, true)}
							onDoubleClick={() => this._handleDoubleClick()}
							className={`
                                flex flex-col gap-2 w-[120px] h-[120px] py-2 cursor-pointer rounded-lg
                                ${this.state.isRenaming ? "px-1 scale-150 relative z-[9999] backdrop-blur-sm" : "px-5 scale-100"}
                                ${this.props.selected ? "bg-muted-foreground/35" : "hover:bg-secondary"}
								${this.state.isDragOver ? "bg-black/50" : ""}
                                transition-all duration-300 ease-in-out
                            `}
						>
							<div className="relative w-full aspect-square">
								{/* Loading */}
								<Grid
									width={50}
									height={50}
									color="#ffffff"
									wrapperStyle={{
										opacity: this.state.isLoading ? "1" : "0",
									}}
									wrapperClass="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none"
								/>

								{/* Icon */}
								<div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex justify-center items-center w-full h-full">
									{icon ?? <GrStatusUnknown size="64px" color="gray" />}
								</div>
							</div>

							<div
								style={{
									color: icon ? undefined : "gray",
								}}
								onDoubleClick={(ev) => this._handleNameDoubleClicked(ev)}
								className={`select-none text-center w-full ${this.state.isRenaming ? "" : "text-ellipsis overflow-hidden whitespace-nowrap"}`}
							>
								{this.state.isRenaming && (
									<Input
										className="h-5 py-0 text-center scale-75 bg-primary-foreground"
										ref={(r) => {
											setTimeout(() => {
												r?.focus();
												r?.select();
											}, 300);
										}}
										onClick={(ev) => ev.stopPropagation()}
										onChange={(ev) => (this._renameValue = ev.currentTarget.value)}
										defaultValue={basename(this.props.absolutePath)}
										onFocus={(ev) => (this._renameValue = ev.currentTarget.value)}
										onKeyDown={(ev) => ev.key === "Enter" && this._handleRenameFileOrFolder(ev.currentTarget.value)}
									/>
								)}

								{!this.state.isRenaming && basename(this.props.absolutePath)}
							</div>
						</div>
					</ContextMenuTrigger>
					{this._getContextMenuContent()}
				</ContextMenu>
			</Tooltip>
		);
	}

	public async componentDidMount(): Promise<void> {
		try {
			const fStat = await stat(this.props.absolutePath);
			if (fStat.isDirectory()) {
				this.setState({ isDirectory: true });
				await this._computePreviewImage();
			}

			this.setState({ isLoading: false });
		} catch (e) {
			// Catch silently.
		}
	}

	private _handleKeyUp(ev: KeyboardEvent<HTMLDivElement>): void {
		ev.stopPropagation();

		if (isDarwin() && ev.key === "Enter") {
			this._handleRenamingItem();
		} else if (!isDarwin() && ev.key === "F2") {
			this._handleRenamingItem();
		}
	}

	private _handleDoubleClick(): void {
		if (!this.state.isLoading && !this.state.isRenaming) {
			this.props.onDoubleClick(this);

			try {
				this.onDoubleClick();
			} catch (e) {
				console.error(e);
			}
		}
	}

	/**
	 * Called on the item is double-clicked. To be overriden by the specialized items implementations.
	 */
	protected onDoubleClick(): void | Promise<void> {
		// If it's a file (not a directory), open it in the default editor
		if (!this.state.isDirectory) {
			ipcRenderer.send("editor:open-with", this.props.absolutePath);
		}
	}

	private _handleDragStart(ev: DragEvent<HTMLDivElement>): void {
		const extension = extname(this.props.absolutePath).toLowerCase();
		const files = this.props.editor.layout.assets.state.selectedKeys.filter((key) => extname(key).toLowerCase() === extension);

		const alreadySelected = files.includes(this.props.absolutePath);

		if (!alreadySelected) {
			files.splice(0, files.length, this.props.absolutePath);
		}

		if (!alreadySelected) {
			if (ev.ctrlKey || ev.metaKey) {
				this.props.editor.layout.assets.addToSelectedFiles(this.props.absolutePath);
			} else {
				this.props.editor.layout.assets.setSelectedFile(this.props.absolutePath);
			}
		}

		ev.dataTransfer.setData("assets", JSON.stringify(files));
	}

	private async _handleDrop(ev: DragEvent<HTMLDivElement>): Promise<void> {
		ev.preventDefault();
		ev.stopPropagation();

		this.setState({
			isDragOver: false,
		});

		if (!this.state.isDirectory || this.props.absolutePath.endsWith(".scene")) {
			return;
		}

		try {
			JSON.parse(ev.dataTransfer.getData("assets"));
		} catch (e) {
			return;
		}

		return this.props.editor.layout.assets.handleMoveSelectedFilesTo(this.props.absolutePath);
	}

	private _renameMouseListener: ((ev: globalThis.MouseEvent) => void) | null = null;
	private _renameKeyboardListener: ((ev: globalThis.KeyboardEvent) => void) | null = null;

	private _handleNameDoubleClicked(ev: MouseEvent<HTMLDivElement>): void {
		if (!this.state.isRenaming) {
			ev.stopPropagation();
			this._handleRenamingItem();
		}
	}

	private _handleRenamingItem(): void {
		this.setState({
			isRenaming: true,
		});

		document.addEventListener(
			"keyup",
			(this._renameKeyboardListener = (ev) => {
				if (ev.key === "Escape") {
					this.setState({
						isRenaming: false,
					});
					this._removeRenameEventListeners();

					this.props.setSelectionEnabled(true);
				}
			}),
			true
		);

		window.addEventListener(
			"click",
			(this._renameMouseListener = () => {
				this._handleRenameFileOrFolder(this._renameValue);
			}),
			true
		);
	}

	private async _handleRenameFileOrFolder(value: string): Promise<void> {
		try {
			if (basename(this.props.absolutePath) !== value) {
				const valueExtension = extname(value);
				const existingExtenstion = extname(this.props.absolutePath);

				if (valueExtension !== existingExtenstion) {
					value += existingExtenstion;
				}

				const newAbsolutePath = `${join(dirname(this.props.absolutePath), value)}`;

				await rename(this.props.absolutePath, newAbsolutePath);

				// Check file renamed
				this.props.editor.layout.assets.handleFileRenamed(this.props.absolutePath, newAbsolutePath);

				this.props.onRefresh();
			}
		} catch (e) {
			console.error(e);
			toast("Failed to rename the file or folder.");
		}

		this.setState({
			isRenaming: false,
		});
		this._removeRenameEventListeners();

		this.props.setSelectionEnabled(true);
	}

	private _removeRenameEventListeners(): void {
		if (this._renameKeyboardListener) {
			document.removeEventListener("keyup", this._renameKeyboardListener, true);
			this._renameKeyboardListener = null;
		}

		if (this._renameMouseListener) {
			window.removeEventListener("click", this._renameMouseListener, true);
			this._renameMouseListener = null;
		}
	}

	/**
	 * Returns the context menu content for the current item.
	 * To be overriden by the specialized items implementations.
	 */
	protected getContextMenuContent(): ReactNode {
		return null;
	}

	private _getContextMenuContent(): ReactNode {
		const isDarwin = platform() === "darwin";
		const items: ReactNode[] = [this.getContextMenuContent()];

		return (
			<ContextMenuContent>
				{!this.state.isDirectory && (
					<ContextMenuItem className="flex items-center gap-2" onClick={() => ipcRenderer.send("editor:open-with", this.props.absolutePath)}>
						Open
					</ContextMenuItem>
				)}

				<ContextMenuItem className="flex items-center gap-2" onClick={() => ipcRenderer.send("editor:show-item", this.props.absolutePath)}>
					{`Show in ${isDarwin ? "Finder" : "Explorer"}`}
				</ContextMenuItem>

				{items.map((item, index) => (
					<Fragment key={`context-menu-item-${index}`}>{item}</Fragment>
				))}
				{items.filter((item) => item).length > 0 && <ContextMenuSeparator />}

				<ContextMenuItem onClick={() => this.props.editor.layout.assets.copySelectedFiles()}>Copy</ContextMenuItem>

				<ContextMenuSeparator />

				<ContextMenuItem
					onClick={(ev) => {
						ev.stopPropagation();
						this._handleRenamingItem();
					}}
				>
					Rename...
				</ContextMenuItem>
				<ContextMenuSeparator />

				<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this._handleTrashItem()}>
					<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Delete
				</ContextMenuItem>
			</ContextMenuContent>
		);
	}

	private async _handleTrashItem(): Promise<void> {
		try {
			const result = ipcRenderer.sendSync("editor:trash-items", this.props.editor.layout.assets.state.selectedKeys);

			if (!result) {
				toast("Failed to trash some assets");
			}

			this.props.onRefresh();
		} catch (e) {
			console.error(e);
		}
	}

	private async _computePreviewImage(): Promise<void> {
		const files = await readdir(this.props.absolutePath);
		const previewImage = files.find((f) => f.startsWith("editor_preview") && (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")));

		if (previewImage) {
			this.setState({
				previewImage: join(this.props.absolutePath, previewImage),
			});
		}
	}

	protected getIcon(): ReactNode {
		if (this.state.isDirectory) {
			if (this.state.previewImage) {
				return <img src={this.state.previewImage} className="p-2 w-20 h-20 object-contain bg-secondary rounded-lg" />;
			}

			return <FolderIcon width="80px" />;
		}

		const extension = extname(this.props.absolutePath).toLowerCase();
		switch (extension) {
			case ".png":
			case ".jpg":
			case ".jpeg":
			case ".svg":
			case ".ico":
				return <img alt="" src={this.props.absolutePath} className="w-[120px] aspect-square object-contain" />;

			case ".env":
				return <SiDotenv size="64px" />;

			case ".mp3":
				return <BsFiletypeMp3 size="64px" />;

			case ".wav":
			case ".wave":
				return <BsFiletypeWav size="64px" />;

			case ".js":
			case ".jsx":
				return <SiJavascript size="64px" />;

			case ".ts":
			case ".tsx":
				return <SiTypescript size="64px" />;

			case ".css":
				return <BiSolidFileCss size="64px" />;

			case ".md":
				return <AiFillFileMarkdown size="80px" />;

			case ".bjseditor":
				return <SiBabylondotjs size="64px" />;

			case ".ies":
				return <GiCeilingLight size="64px" />;

			case ".exr":
				return <EXRIcon size="64px" />;

			default:
				return null;
		}
	}
}
