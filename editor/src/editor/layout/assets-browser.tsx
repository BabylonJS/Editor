import { readdir } from "fs-extra";
import { dirname, join, extname } from "path/posix";

import { Component, ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { FaFolder } from "react-icons/fa";
import { SiBabylondotjs } from "react-icons/si";

import { Button, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { Editor } from "../main";

import { normalizedGlob } from "../../tools/fs";

import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../project/configuration";

import { FileInspectorObject } from "./inspector/file";

import { AssetBrowserMeshItem } from "./assets-browser/mesh-item";
import { AssetsBrowserItem, IAssetsBrowserItemProps } from "./assets-browser/item";

import "babylonjs-loaders";
import "../../loader/assimpjs";

export interface IEditorAssetsBrowserProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IEditorAssetsBrowserState {
    /**
     * The sizes of the panels.
     */
    sizes: number[];

    files: string[];
    browsedPath?: string;

    filesTreeNodes: TreeNodeInfo[];
}

export class EditorAssetsBrowser extends Component<IEditorAssetsBrowserProps, IEditorAssetsBrowserState> {
    public constructor(props: IEditorAssetsBrowserProps) {
        super(props);

        this.state = {
            files: [],
            sizes: [25, 75],
            filesTreeNodes: [],
        };
    }

    public render(): ReactNode {
        return (
            <PanelGroup
                id="group"
                direction="horizontal"
            >
                <Panel id="left-panel" order={1} defaultSize={this.state.sizes[0]} minSize={20}>
                    <Tree
                        contents={this.state.filesTreeNodes}
                        onNodeClick={(n) => this._handleNodeClicked(n)}
                        onNodeExpand={(n) => this._handleNodeExpanded(n)}
                        onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
                    />
                </Panel>

                <PanelResizeHandle id="resize" className="w-2 bg-black/10 h-full cursor-pointer hover:bg-black/30 transition-all duration-300" />

                <Panel id="right-panel" order={2} defaultSize={this.state.sizes[1]} minSize={20}>
                    {this._getFilesGridComponent()}
                </Panel>
            </PanelGroup>
        );
    }

    public componentDidMount(): void {
        onProjectConfigurationChangedObservable.add((c) => {
            if (c.path) {
                this._refreshFilesTreeNodes(c.path);
                this._setBrowsePath(dirname(c.path));
            }
        });
    }

    private async _refreshFilesTreeNodes(path: string): Promise<void> {
        const files = await normalizedGlob(join(dirname(path), "**"), {
            ignore: {
                ignored: (p) => !p.isDirectory(),
                childrenIgnored: (p) => extname(p.name) === ".scene",
            },
        });

        const allNodes: TreeNodeInfo[] = [];
        const filesTreeNodes: TreeNodeInfo[] = [];

        files.forEach((f) => {
            const relative = f.replace(join(dirname(path), "/"), "");
            const split = relative.split("/");

            for (let i = 0, len = split.length; i < len; ++i) {
                const relativePath = split.slice(0, i + 1).join("/");

                let node = allNodes.find((n) => n.id === relativePath);
                if (!node) {
                    node = {
                        label: (
                            <div className="ml-2 p-1">
                                {split[i]}
                            </div>
                        ),
                        id: relativePath,
                        nodeData: relativePath,
                        icon: <FaFolder className="w-4 h-4" />,
                    };

                    if (i === 0) {
                        filesTreeNodes.push(node);
                    } else {
                        const parent = allNodes.find((n) => n.id === split.slice(0, i).join("/"));
                        if (parent) {
                            parent.childNodes = parent.childNodes ?? [];
                            parent.childNodes.push(node);
                        }
                    }

                    allNodes.push(node);
                }
            }
        });

        this.setState({
            filesTreeNodes: [{
                label: (
                    <div className="ml-2 p-1">
                        Project
                    </div>
                ),
                id: "/",
                nodeData: "/",
                isExpanded: true,
                childNodes: filesTreeNodes,
                icon: <SiBabylondotjs className="w-4 h-4" />,
            }],
        });
    }

    private async _setBrowsePath(path: string): Promise<void> {
        this.setState({ browsedPath: path });

        return this._refreshItems(path);
    }

    private async _refreshItems(path: string): Promise<void> {
        let files = await readdir(path);
        files = files.filter((f) => f.charAt(0) !== ".");

        this.setState({ files });
    }

    private _getFilesGridComponent(): ReactNode {
        return (
            <div className="flex flex-col w-full h-full">
                <div className="flex gap-2 justify-between w-full h-10 bg-[#222222]">
                    <div className="flex gap-2 h-full">
                        <Button disabled={this._isBrowsingProjectRootPath()} minimal icon="arrow-left" className="transition-all duration-300" onClick={() => this._setBrowsePath(dirname(this.state.browsedPath!))} />
                        <Button minimal icon="arrow-right" className="transition-all duration-300" />
                    </div>

                    <Button minimal icon="refresh" className="transition-all duration-300" disabled={!this.state.browsedPath} onClick={() => this._refreshItems(this.state.browsedPath!)} />
                </div>
                <div
                    style={{
                        gridTemplateRows: `repeat(auto-fill, ${120 * 1}px)`,
                        gridTemplateColumns: `repeat(auto-fill, ${120 * 1}px)`,
                    }}
                    className="grid gap-4 justify-left w-full h-full p-5 overflow-y-auto"
                >
                    {this.state.files.map((f) => this._getAssetBrowserItem(f))}
                </div>
            </div>
        );
    }

    private _getAssetBrowserItem(f: string): ReactNode {
        const extension = extname(f).toLowerCase();

        const props: IAssetsBrowserItemProps & { key: string; } = {
            editor: this.props.editor,
            key: join(this.state.browsedPath!, f),
            absolutePath: join(this.state.browsedPath!, f),
            onClick: (i) => this._handleItemClick(i),
            onDoubleClick: (i) => this._handleItemDoubleClick(i),
            onRefresh: () => this._refreshItems(this.state.browsedPath!),
        };

        switch (extension) {
            case ".fbx":
            case ".3ds":
            case ".glb":
            case ".obj":
            case ".gltf":
            case ".blend":
            case ".babylon":
                return <AssetBrowserMeshItem {...props} />;

            default:
                return <AssetsBrowserItem {...props} />;
        }
    }

    /**
     * Returns whether the browsed path is the project root path.
     * @returns Whether the browsed path is the project root path.
     */
    private _isBrowsingProjectRootPath(): boolean {
        if (!this.state.browsedPath) {
            return true;
        }

        return join(this.state.browsedPath!) === join(dirname(projectConfiguration.path!));
    }

    private async _handleItemClick(item: AssetsBrowserItem): Promise<void> {
        const extension = extname(item.props.absolutePath).toLowerCase();
        switch (extension) {
            case ".md": return this.props.editor.layout.inspector.setEditedObject(new FileInspectorObject(item.props.absolutePath));
        }
    }

    private async _handleItemDoubleClick(item: AssetsBrowserItem): Promise<void> {
        if (item.state.isDirectory) {
            this._setBrowsePath(item.props.absolutePath);
        }
    }

    private _handleNodeClicked(node: TreeNodeInfo): void {
        this._setBrowsePath(join(dirname(projectConfiguration.path!), node.id as string));

        this._forEachNode(this.state.filesTreeNodes, (n) => n.isSelected = n.id === node.id);
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _handleNodeExpanded(node: TreeNodeInfo): void {
        this._forEachNode(this.state.filesTreeNodes, (n) => n.id === node.id && (n.isExpanded = true));
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _handleNodeCollapsed(node: TreeNodeInfo): void {
        this._forEachNode(this.state.filesTreeNodes, (n) => n.id === node.id && (n.isExpanded = false));
        this.setState({ filesTreeNodes: this.state.filesTreeNodes });
    }

    private _forEachNode(nodes: TreeNodeInfo[] | undefined, callback: (node: TreeNodeInfo, index: number) => void) {
        if (nodes === undefined) {
            return;
        }

        for (let i = 0, len = nodes.length; i < len; ++i) {
            const node = nodes[i];

            callback(node, i);
            this._forEachNode(node.childNodes, callback);
        }
    }
}
