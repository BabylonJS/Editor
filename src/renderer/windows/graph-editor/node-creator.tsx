import { Nullable, IStringDictionary } from "../../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, FormGroup, InputGroup, Classes, Tree, ITreeNode } from "@blueprintjs/core";

import { LiteGraph } from "litegraph.js";

export interface INodeCreatorProps {
    /**
     * Defines the HTML element where to dialog is mounted.
     */
    container: HTMLDivElement;
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
    public static Show(): Promise<Nullable<string>> {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        document.body.appendChild(container);

        return new Promise<Nullable<string>>((resolve) => {
            const dialog = <NodeCreator container={container} onSelect={(type) => resolve(type)} />;
            ReactDOM.render(dialog, container);
        });
    }

    private _enterListener: (this: Window, ev: WindowEventMap["keyup"]) => void;
    private _selectedNode: Nullable<ITreeNode> = null;

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
            <Dialog
                isOpen={true}
                usePortal={true}
                title="Create New Node"
                className={Classes.DARK}
                enforceFocus={true}
                style={{ width: "800px", height: "600px" }}
                onClose={() => this._handleClose(true)}
            >
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup disabled={false} inline={false} label="Search..." labelFor="filter-input" labelInfo="(filter)">
                        <InputGroup id="filter-input" placeholder="Search..." disabled={false} autoFocus={true} type="text" onChange={(v) => this.setState({ filter: v.target.value, nodes: this._updateTreeNodes(v.target.value) })} />
                    </FormGroup>
                    <div style={{ width: "760px", height: "600px" }}>
                        <Tree
                            contents={this.state.nodes}
                            // onNodeClick={this.handleNodeClick}
                            onNodeCollapse={(n) => this._handleNodeCollapse(n)}
                            onNodeExpand={(n) => this._handleNodeExpand(n)}
                            className={Classes.ELEVATION_0}
                        />
                    </div>
                </div>
            </Dialog>
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
        if (this._enterListener) {
            window.removeEventListener("keyup", this._enterListener);
        }

        if (!discard) {
            this.props.onSelect(this._selectedNode?.id as string ?? null);
        }

        ReactDOM.unmountComponentAtNode(this.props.container);
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

        const folders: ITreeNode[] = [];
        filter = filter.toLowerCase();

        for (const folder in map) {
            const nodes = map[folder];
            const children = nodes.filter((n) => n.toLowerCase().indexOf(filter) !== -1).map((n) => ({
                id: `${folder}/${n}`,
                hasCaret: false,
                label: n,
            })) as ITreeNode[];

            if (!children.length) {
                continue;
            }

            folders.push({
                id: folder,
                hasCaret: children.length > 0,
                icon: "folder-close",
                label: folder,
                isExpanded: true,
                childNodes: children,
            });
        }

        if (folders.length) {
            const firstChild = folders[0].childNodes![0];
            if (firstChild) {
                firstChild.isSelected = true;
                this._selectedNode = firstChild;
            }
        }

        return folders;
    }
}
