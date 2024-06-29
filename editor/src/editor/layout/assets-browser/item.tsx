import { platform } from "os";
import { rename, stat } from "fs-extra";
import { basename, extname, dirname, join } from "path/posix";

import { ipcRenderer } from "electron";

import { Component, MouseEvent, ReactNode } from "react";

import { Tooltip } from "@blueprintjs/core";

import { Grid } from "react-loader-spinner";

import { toast } from "sonner";

import { VscJson } from "react-icons/vsc";
import { RiFinderFill } from "react-icons/ri";
import { BiSolidFileCss } from "react-icons/bi";
import { GrStatusUnknown } from "react-icons/gr";
import { AiFillFileMarkdown, AiOutlineClose } from "react-icons/ai";
import { SiBabylondotjs, SiDotenv, SiJavascript, SiTypescript } from "react-icons/si";

import { FolderIcon } from "@heroicons/react/20/solid";

import { Input } from "../../../ui/shadcn/ui/input";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "../../../ui/shadcn/ui/context-menu";

import { Editor } from "../../main";

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
}

export class AssetsBrowserItem extends Component<IAssetsBrowserItemProps, IAssetsBrowserItemState> {
    public constructor(props: IAssetsBrowserItemProps) {
        super(props);

        this.state = {
            isLoading: true,
            isRenaming: false,
            isDirectory: false,
        };
    }

    public render(): ReactNode {
        const icon = this.getIcon();

        return (
            <Tooltip position="bottom" content={basename(this.props.absolutePath)}>
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div
                            draggable={!this.state.isRenaming}
                            onDrop={(ev) => this._handleDrop(ev)}
                            onDragStart={(ev) => this._handleDragStart(ev)}
                            onDragOver={(ev) => ev.preventDefault()}
                            onClick={(ev) => {
                                ev.stopPropagation();

                                if (!this.state.isLoading && !this.state.isRenaming) {
                                    this.props.onClick(ev, this, false);
                                }
                            }}
                            onContextMenu={(ev) => !this.state.isLoading && !this.state.isRenaming && this.props.onClick(ev, this, true)}
                            onDoubleClick={() => !this.state.isLoading && !this.state.isRenaming && this.props.onDoubleClick(this)}
                            className={`
                                flex flex-col gap-2 w-[120px] h-[120px] py-2 cursor-pointer rounded-lg
                                ${this.state.isRenaming ? "px-1 scale-150" : "px-5 scale-100"}
                                ${this.props.selected ? "bg-muted-foreground/35" : "hover:bg-secondary"}
                                transition-all duration-300
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
                                onDoubleClick={(ev) => {
                                    if (!this.state.isRenaming) {
                                        ev.stopPropagation();
                                        this.setState({ isRenaming: true });
                                    }
                                }}
                                className={`select-none text-center w-full ${this.state.isRenaming ? "" : "text-ellipsis overflow-hidden whitespace-nowrap"}`}
                            >
                                {this.state.isRenaming &&
                                    <Input
                                        className="h-5 py-0 text-center scale-75"
                                        ref={(r) => {
                                            setTimeout(() => {
                                                r?.focus();
                                                r?.select();
                                            }, 0);
                                        }}
                                        defaultValue={basename(this.props.absolutePath)}
                                        onBlur={(ev) => this._handleRenameFileOrFolder(ev.currentTarget.value)}
                                        onKeyDown={(ev) => ev.key === "Enter" && this._handleRenameFileOrFolder(ev.currentTarget.value)}
                                    />
                                }

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
            }

            this.setState({ isLoading: false });
        } catch (e) {
            // Catch silently.
        }
    }

    private _handleDragStart(ev: React.DragEvent<HTMLDivElement>): void {
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

    private async _handleDrop(ev: React.DragEvent<HTMLDivElement>): Promise<void> {
        ev.preventDefault();
        ev.stopPropagation();

        if (!this.state.isDirectory) {
            return;
        }

        try {
            JSON.parse(ev.dataTransfer.getData("assets"));
        } catch (e) {
            return;
        }

        return this.props.editor.layout.assets.handleMoveSelectedFilesTo(this.props.absolutePath);
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
            toast("Failed to rename the file or folder.", {
                important: true,
            });
        }

        this.setState({ isRenaming: false });
        this.props.setSelectionEnabled(true);
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
                <ContextMenuItem className="flex items-center gap-2" onClick={() => ipcRenderer.send("editor:show-item", this.props.absolutePath)}>
                    <RiFinderFill className="w-5 h-5" /> {`Show in ${isDarwin ? "Finder" : "Explorer"}`}
                </ContextMenuItem>

                <ContextMenuSeparator />

                {items}
                {items.filter((item) => item).length > 0 &&
                    <ContextMenuSeparator />
                }

                <ContextMenuItem onClick={() => this.props.editor.layout.assets.copySelectedFiles()}>Copy</ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem onClick={() => {
                    this.setState({ isRenaming: true });
                    this.props.setSelectionEnabled(false);
                }}>
                    Rename...
                </ContextMenuItem>
                <ContextMenuSeparator />

                <ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => this._handleTrashItem()}>
                    <AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove
                </ContextMenuItem>
            </ContextMenuContent>
        );
    }

    private async _handleTrashItem(): Promise<void> {
        try {
            const result = ipcRenderer.sendSync(
                "editor:trash-items",
                this.props.editor.layout.assets.state.selectedKeys,
            );

            if (!result) {
                toast("Failed to trash some assets", {
                    important: true,
                });
            }

            this.props.onRefresh();
        } catch (e) {
            console.error(e);
        }
    }

    protected getIcon(): ReactNode {
        if (this.state.isDirectory) {
            return <FolderIcon width="80px" />;
        }

        const extension = extname(this.props.absolutePath).toLowerCase();
        switch (extension) {
            case ".json": return <VscJson size="64px" />;

            case ".js":
            case ".jsx":
                return <SiJavascript size="80px" />;

            case ".ts":
            case ".tsx":
                return <SiTypescript size="80px" />;

            case ".css":
                return <BiSolidFileCss size="64px" />;

            case ".md":
                return <AiFillFileMarkdown size="64px" />;

            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".svg":
            case ".ico":
                return <img alt="" src={this.props.absolutePath} className="w-[120px] aspect-square object-contain" />;

            case ".env": return <SiDotenv size="80px" />;

            case ".bjseditor": return <SiBabylondotjs size="64px" />;

            default: return null;
        }
    }
}
