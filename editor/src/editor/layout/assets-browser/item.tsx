import { stat } from "fs-extra";
import { platform } from "os";
import { basename, extname } from "path/posix";

import { shell } from "electron";

import { Component, ReactNode } from "react";
import { Tooltip, ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { Grid } from "react-loader-spinner";

import { VscJson } from "react-icons/vsc";
import { RiFinderFill } from "react-icons/ri";
import { BiSolidFileCss } from "react-icons/bi";
import { GrStatusUnknown } from "react-icons/gr";
import { AiFillFileMarkdown } from "react-icons/ai";
import { FolderIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { SiBabylondotjs, SiDotenv, SiJavascript, SiTypescript } from "react-icons/si";

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
     * Called on click.
     * @param item the item that has been clicked.
     */
    onClick: (item: AssetsBrowserItem) => void;
    /**
     * Called on double click.
     * @param item the item that has been double clicked.
     */
    onDoubleClick: (item: AssetsBrowserItem) => void;

    /**
     * Called on the item asks for a refresh.
     */
    onRefresh: () => void;
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
}

export class AssetsBrowserItem extends Component<IAssetsBrowserItemProps, IAssetsBrowserItemState> {
    public constructor(props: IAssetsBrowserItemProps) {
        super(props);

        this.state = {
            isLoading: true,
            isDirectory: false,
        };
    }

    public render(): ReactNode {
        const icon = this.getIcon();

        return (
            <Tooltip position="bottom" content={basename(this.props.absolutePath)}>
                <ContextMenu content={this._getContextMenuContent()}>
                    <div
                        draggable
                        onDragStart={(ev) => this._handleDragStart(ev)}
                        onClick={() => !this.state.isLoading && this.props.onClick(this)}
                        onDoubleClick={() => !this.state.isLoading && this.props.onDoubleClick(this)}
                        className="flex flex-col gap-2 w-[120px] h-[120px] px-5 py-2 cursor-pointer hover:bg-black/20 transition-all duration-300"
                    >
                        <div className="relative h-full aspect-square bg-black/10">
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
                            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-full h-full">
                                {icon ?? <GrStatusUnknown size="80px" color="gray" />}
                            </div>
                        </div>
                        <div
                            style={{
                                color: icon ? undefined : "gray",
                            }}
                            className="select-none text-center text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                            {basename(this.props.absolutePath)}
                        </div>
                    </div>
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
        ev.dataTransfer.setData("asset", this.props.absolutePath);
    }

    /**
     * Returns the context menu content for the current item.
     * To be overriden by the specialized items implementations.
     */
    protected getContextMenuContent(): ReactNode {
        return null;
    }

    private _getContextMenuContent(): JSX.Element {
        const isDarwin = platform() === "darwin";
        const items: ReactNode[] = [this.getContextMenuContent()];

        return (
            <Menu>
                <MenuItem
                    text={`Show in ${isDarwin ? "Finder" : "Explorer"}`}
                    onClick={() => shell.showItemInFolder(this.props.absolutePath)}
                    icon={isDarwin ? <RiFinderFill className="w-4 h-4" color="white" /> : <RiFinderFill />}
                />
                <MenuDivider />
                {items}
                {items.length &&
                    <MenuDivider />
                }
                <MenuItem icon={<XMarkIcon className="w-4 h-4" color="white" />} text="Remove" onClick={() => this._handleTrashItem()} />
            </Menu>
        );
    }

    private async _handleTrashItem(): Promise<void> {
        try {
            await shell.trashItem(this.props.absolutePath);
            this.props.onRefresh();
        } catch (e) {
            // Catch silently.
        }
    }

    protected getIcon(): ReactNode {
        if (this.state.isDirectory) {
            return <FolderIcon width="80px" />;
        }

        const extension = extname(this.props.absolutePath).toLowerCase();
        switch (extension) {
            case ".json": return <VscJson size="80px" />;

            case ".js":
            case ".jsx":
                return <SiJavascript size="80px" />;

            case ".ts":
            case ".tsx":
                return <SiTypescript size="80px" />;

            case ".css":
                return <BiSolidFileCss size="80px" />;

            case ".md":
                return <AiFillFileMarkdown size="80px" />;

            case ".png":
            case ".jpg":
            case ".jpeg":
            case ".svg":
            case ".ico":
                return <img alt="" src={this.props.absolutePath} className="w-[120px] aspect-square object-contain" />;

            case ".env": return <SiDotenv size="80px" />;

            case ".bjseditor": return <SiBabylondotjs size="80px" />;

            default: return null;
        }
    }
}
