import { Undefinable } from "../../../shared/types";

import * as React from "react";
import Tree from "antd/lib/tree/Tree";
import { ContextMenu, Classes, Menu, MenuItem } from "@blueprintjs/core";

import { Icon } from "./icon";

export interface IListItem {
    /**
     * The name of the element in the graph list.
     */
    name: string;
    /**
     * The id of the element in the graph list.
     */
    id: string;
    /**
     * Defines the optional icon to draw for the element
     */
    icon?: Undefinable<JSX.Element>;
}

export interface IGraphListProps {
    /**
     * Defines the list of elements to draw in the graph.
     */
    list: IListItem[];
    /**
     * Optional list of already selected elements in the graph list.
     */
    selectedIds?: Undefinable<string[]>;
    /**
     * Optional css properties for the graph.
     */
    style?: Undefinable<React.CSSProperties>;
    /**
     * Optional callback called on the user wants to remove elements from the list.
     */
    onRemove?: Undefinable<(ids: string[]) => void>;
}

export interface IGraphListState {
    /**
     * Defines the list of elements to draw in the graph.
     */
    list: IListItem[];
    /**
     * Optional list of already selected elements in the graph list.
     */
    selectedIds: string[];
}

export class GraphList extends React.Component<IGraphListProps, IGraphListState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IGraphListProps) {
        super(props);

        this.state = {
            list: props.list.slice(),
            selectedIds: props.selectedIds ?? [],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const nodes = this.state.list.map((item) => (
            <Tree.TreeNode
                active={true}
                expanded={true}
                title={<span style={{ color: "white" }}>{item.name}</span>}
                key={item.id}
                isLeaf={true}
                icon={item.icon}
                style={{ height: "25px" }}
            >
            </Tree.TreeNode>
        ));

        return (
            <div style={{ width: "100%", height: "100%", overflow: "scroll", ...this.props.style ?? { } }}>
                <Tree.DirectoryTree
                    className="draggable-tree"
                    draggable={false}
                    multiple={true}
                    showIcon={true}
                    checkable={false}
                    key={"Graph"}
                    style={{ height: "100%" }}
                    blockNode={true}
                    onRightClick={this.props.onRemove && ((e) => this._handleNodeContextMenu(e.event, e.node))}
                    onSelect={(k) => this._handleSelectedNodes(k as string[])}
                    autoExpandParent={false}
                    selectedKeys={this.state.selectedIds}
                >
                    {nodes}
                </Tree.DirectoryTree>
            </div>
        )
    }

    /**
     * Called on the user selects keys in the graph.
     */
    private _handleSelectedNodes(keys: string[]): void {
        this.setState({ selectedIds: keys });
    }

    /**
     * Called on the user right-clicks on a node.
     * @param graphNode the node being right-clicked in the tree.
     * @param e the event object coming from react.
     */
    private _handleNodeContextMenu(e: React.MouseEvent, graphNode: any): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this.props.onRemove!(this.state.selectedIds)} />
            </Menu>,
            { left: e.clientX, top: e.clientY }
        );

        const selectedIds = this.state.selectedIds.slice();
        if (selectedIds.indexOf(graphNode.key) !== -1) { return; }
        
        if (e.ctrlKey) {
            selectedIds.push(graphNode.key);
            this.setState({ selectedIds });
        } else {
            this.setState({ selectedIds: [graphNode.key] });
        }
    }
}