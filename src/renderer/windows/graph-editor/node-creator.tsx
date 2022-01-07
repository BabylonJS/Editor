import { Nullable, IStringDictionary } from "../../../shared/types";

import * as React from "react";
import { FormGroup, InputGroup, Classes, Tree, ITreeNode, ContextMenu, Menu } from "@blueprintjs/core";

import { LiteGraph } from "litegraph.js";

export interface INodeCreatorProps {
    /**
     * Callback, called on the 
     */
    onSelect: (type: Nullable<string>) => void;
}

export interface INodeCreateState {
    /**
     * Defines the current value of the filter.
     */
    filter: string;
    /**
     * Defines the list of all tree nodes.
     */
    nodes: ITreeNode[];
}

export class NodeCreator extends React.Component<INodeCreatorProps, INodeCreateState> {
    /**
     * Shows the node creator.
     */
    public static Show(event: MouseEvent): Promise<Nullable<string>> {
        return new Promise<Nullable<string>>((resolve) => {
            let ref: Nullable<NodeCreator> = null;

            ContextMenu.show((
                <Menu>
                    <NodeCreator ref={(r) => ref = r} onSelect={(type) => resolve(type)} />
                </Menu>
            ), {
                top: event.clientY,
                left: event.clientX,
            }, () => {
                ref?._clearKeyboardEvent();
            });
        });
    }

    private _selectedNode: Nullable<ITreeNode> = null;
    private _enterListener: (this: Window, ev: WindowEventMap["keyup"]) => void;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: INodeCreatorProps) {
        super(props);
        this.state = {
            filter: "",
            nodes: this._updateTreeNodes(""),
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <FormGroup disabled={false} inline={false} label="Search..." labelFor="filter-input" labelInfo="(filter)">
                    <InputGroup style={{ backgroundColor: "rgba(16, 22, 26, 0.3)", color: "white" }} id="filter-input" placeholder="Search..." disabled={false} autoFocus={true} type="text" onChange={(v) => {
                        this.setState({ filter: v.target.value, nodes: this._updateTreeNodes(v.target.value) });
                    }} />
                </FormGroup>
                <div style={{ minWidth: "500px", height: "450px", overflow: "auto" }}>
                    <Tree
                        contents={this.state.nodes}
                        onNodeDoubleClick={(n) => this._handleNodeDoubleClick(n)}
                        onNodeCollapse={(n) => this._handleNodeCollapse(n)}
                        onNodeExpand={(n) => this._handleNodeExpand(n)}
                        className={Classes.ELEVATION_0}
                    />
                </div>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        window.addEventListener("keyup", this._enterListener = (ev) => {
            if (ev.keyCode === 13) { this._handleClose(); }
        });
    }

    /**
     * Called on the dialog is being closed.
     */
    private _handleClose(discard?: boolean): void {
        if (!discard) {
            this.props.onSelect(this._selectedNode?.id as string ?? null);
        }

        ContextMenu.hide();
    }

    /**
     * Clears the registered keyboard events on window etc.
     */
    private _clearKeyboardEvent(): void {
        if (this._enterListener) {
            window.removeEventListener("keyup", this._enterListener);
        }
    }

    /**
     * Called on a node is double clicked.
     */
    private _handleNodeDoubleClick(nodeData: ITreeNode): void {
        if (nodeData.childNodes?.length) { return; }

        this._selectedNode = nodeData;
        this._handleClose(false);
    }

    /**
     * Called on a node is being collapsed.
     */
    private _handleNodeCollapse(nodeData: ITreeNode): void {
        nodeData.isExpanded = false;
        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Called on a node is being expanded.
     */
    private _handleNodeExpand(nodeData: ITreeNode): void {
        nodeData.isExpanded = true;
        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Returns the tree to draw node types in it.
     */
    private _updateTreeNodes(filter: string): ITreeNode[] {
        // Map
        const map: IStringDictionary<string[]> = { };
        for (const key in LiteGraph.registered_node_types) {
            const split = key.split("/");
            const folder = split[0];
            const node = split[1];

            if (!map[folder]) { map[folder] = []; }
            map[folder].push(node);
        }

        let folders: ITreeNode[] = [];
        filter = filter.toLowerCase().replace(/ /g, "");

        for (const folder in map) {
            const nodes = map[folder];
            const children = nodes.filter((n) => n.replace(/_/g, "").toLowerCase().indexOf(filter) !== -1).map((n) => ({
                id: `${folder}/${n}`,
                hasCaret: false,
                label: this._getFormatedname(n.replace(/_/g, " ")),
            })) as ITreeNode[];

            if (!children.length) {
                continue;
            }

            // Sort children by id length
            const orderedChildren = children.sort((a, b) => (a.label as string).length - (b.label as string).length);

            folders.push({
                id: folder,
                hasCaret: children.length > 0,
                icon: "folder-close",
                label: this._getFormatedname(folder),
                isExpanded: true,
                childNodes: orderedChildren,
            });
        }

        if (folders.length) {
            // Sort folders by length.
            folders = folders.sort((a, b) => b.childNodes!.length - a.childNodes!.length);

            const firstChild = folders[0].childNodes![0];
            if (firstChild) {
                firstChild.isSelected = true;
                this._selectedNode = firstChild;
            }
        }

        return folders;
    }

    /**
     * Returns the name of the folder or node in its formated form.
     */
    private _getFormatedname(name: string): string {
        return name[0].toUpperCase() + name.substr(1, name.length - 1);
    }
}
