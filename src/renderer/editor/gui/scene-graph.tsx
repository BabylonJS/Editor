import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, InputGroup, Tree, TreeNodeInfo, Icon as BPIcon } from "@blueprintjs/core";

import { AssetContainer, Node, Scene } from "babylonjs";

import { Tools } from "../tools/tools";

import { GraphIcon } from "../components/graph/icon";
import { isAbstractMesh, isNode } from "../components/graph/tools/tools";

export interface ISceneGraphProps {
    /**
     * Defines the reference to the scene that contains the nodes to show in the graph.
     */
    scene: Scene | AssetContainer;

    /**
     * Called on a node has been clicked.
     */
    onNodeClick: (n: TreeNodeInfo<any>) => void;
}

export interface ISceneGraphState {
    /**
     * Defines the current string of the filter box.
     */
    filter: string;

    /**
     * Defines the list of all nodes drawn in the graph.
     */
    nodes: TreeNodeInfo<any>[];
    /**
     * Defines the list of all selected nodes in the graph.
     */
    selectedNodes: TreeNodeInfo<any>[];
}

export class SceneGraph extends React.Component<ISceneGraphProps, ISceneGraphState> {
    private _nodes: TreeNodeInfo<any>[] = [];
    private _previousNodes: TreeNodeInfo<any>[] = [];

    private _expandedNodes: TreeNodeInfo<any>[] = [];

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: ISceneGraphProps) {
        super(props);

        this.state = {
            filter: "",

            nodes: [],
            selectedNodes: [],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <InputGroup
                    type="search"
                    placeholder="Search..."
                    className={Classes.FILL}
                    style={{ marginTop: "5px", marginBottom: "5px" }}
                    onChange={(e) => this._handleSearchChange(e.target.value)}
                    leftIcon={<BPIcon icon="search" style={{ margin: "12px" }} />}
                ></InputGroup>
                <div
                    style={{
                        height: "calc(50vh - 200px)",
                    }}
                >
                    <Tree
                        contents={this.state.nodes}
                        onNodeExpand={(n) => this._handleNodeExpand(n)}
                        onNodeCollapse={(n) => this._handleNodeCollapse(n)}
                        onNodeClick={(n, _, e) => this._handleNodeClick(n, e)}
                        onNodeDoubleClick={(n) => this._handleNodeDoubleClick(n)}
                    />
                </div>
            </>
        );
    }

    /**
     * Called ont he component did mount.
     */
    public componentDidMount(): void {
        this.refresh();
    }

    /**
     * Called on the user filters the graph by name.
     */
    private _handleSearchChange(filter: string): void {
        if (filter.length === 1 && !this.state.filter && !this._expandedNodes.length) {
            this._forEachNode(this.state.nodes, (n) => n.isExpanded && this._expandedNodes.push(n));
        }

        this.setState({ filter }, () => {
            this.refresh(() => {
                if (!this.state.filter) {
                    this._forEachNode(this.state.nodes, (n) => {
                        const expandedNode = this._expandedNodes.find((en) => en.id === n.id);
                        n.isExpanded = expandedNode ? true : false;
                    });

                    this._expandedNodes.splice(0);

                    this.update();
                }
            });
        });
    }

    /**
     * Called on the user expands a node.
     */
    private _handleNodeExpand(node: TreeNodeInfo<any>): void {
        node.isExpanded = true;
        this.update();
    }

    /**
     * Called on the user collapses a node.
     */
    private _handleNodeCollapse(node: TreeNodeInfo<any>): void {
        node.isExpanded = false;
        this.update();
    }

    /**
     * Called on the user double clicks a node.
     */
    private _handleNodeDoubleClick(node: TreeNodeInfo<any>): void {
        node.isExpanded = !node.isExpanded;
        this.update();
    }

    /**
     * Called on the user clicks on a node.
     */
    public _handleNodeClick(node: TreeNodeInfo<any>, event: React.MouseEvent<HTMLElement, MouseEvent>): void {
        const index = this.state.selectedNodes.findIndex((n) => n.id === node.id);

        if (event.shiftKey && this.state.selectedNodes.length) {
            const nodeIndex = this._nodes.findIndex((n) => n.id === node.id);
            const firstIndex = this._nodes.findIndex((n) => n.id === this.state.selectedNodes[0].id);

            if (nodeIndex !== -1 && firstIndex !== -1) {
                const min = Math.max(3, Math.min(nodeIndex, firstIndex));
                const max = Math.max(nodeIndex, firstIndex);

                const subNodes = this._nodes.filter((_, index) => index >= min && index <= max);

                this.state.selectedNodes.splice(0);

                this._forEachNode(this.state.nodes, (n) => {
                    n.isSelected = false;

                    if (!subNodes.find((n2) => n2.id === n.id)) {
                        return;
                    }

                    n.isSelected = true;
                    this.state.selectedNodes.push(n);
                });
            }
        }
        else if (!event.ctrlKey && !event.metaKey) {
            this.state.selectedNodes.splice(0);
            this.state.selectedNodes.push(node);

            this._forEachNode(this.state.nodes, (n) => n.isSelected = false);
            node.isSelected = true;
        } else {
            node.isSelected = index === -1;

            if (index !== -1) {
                this.state.selectedNodes.splice(index, 1);
            } else {
                this.state.selectedNodes.push(node);
            }
        }

        this.update();

        this.props.onNodeClick?.(node);
    }

    /**
     * Refreshes the entire graph.
     * @param done defines the reference to the callback called on the graph has been updated.
     */
    public refresh(done?: () => void): void {
        this._previousNodes = this._nodes;
        this._nodes = [];

        this.setState({ nodes: this._parseSceneNodes() }, () => done?.());

        this._previousNodes = [];
    }

    /**
     * Updates the current graph state without parsing the scene nodes.
     */
    public update(): void {
        this.setState({ nodes: this.state.nodes });
    }

    /**
     * Parses all the scene's nodes and returns the array of all root nodes.
     */
    private _parseSceneNodes(roots?: Node[]): TreeNodeInfo<any>[] {
        this._nodes = [];
        const result = this._nodes.slice();

        roots ??= this.props.scene.getNodes().filter((n) => !n.parent);
        roots.forEach((r) => {
            const node = this._recursivelyParseSceneNodes(r);

            if (node) {
                result.push(node);
            }
        });

        return result;
    }

    /**
     * Recursively parses all the children scene nodes of the given and returns its tree node reference.
     */
    private _recursivelyParseSceneNodes(node: Node): Nullable<TreeNodeInfo<any>> {
        if (isNode(node) && node.doNotSerialize) {
            return null;
        }

        if (isAbstractMesh(node) && node._masterMesh) {
            return null;
        }

        let id = "";
        let disabled = false;

        if (isNode(node)) {
            node.id ??= Tools.RandomId();
            node.name ??= Tools.GetConstructorName(node);
            id = node.id;
        }

        if (isNode(node)) {
            node.metadata ??= {};
        }

        if (isAbstractMesh(node)) {
            disabled = (node.metadata?.collider ?? null) !== null;

            node.metadata.isPickable = disabled ? false : (node.metadata.isPickable ?? false);
            node.isPickable = !disabled;

            node.subMeshes?.forEach((sm) => sm._id = sm._id ?? Tools.RandomId());
        }

        const existingNode = this._previousNodes.find((n) => n.nodeData === node);

        // Updated instantiated references
        // Create tree node
        const treeNode = {
            id,
            disabled,
            nodeData: node,
            icon: <GraphIcon object={node} />,
            label: node.name,

            isSelected: existingNode?.isSelected ?? false,
            isExpanded: this.state.filter ? true : (existingNode?.isExpanded ?? false),
        } as TreeNodeInfo<any>;

        this._nodes.push(treeNode);

        // Parse children
        let childNodes: TreeNodeInfo<any>[] = [];
        if (isNode(node)) {
            childNodes = node.getChildren().map((c) => this._recursivelyParseSceneNodes(c)).filter((n) => n) as TreeNodeInfo<any>[];

            if (!this._matchesFilter(node.name) && !childNodes.length) {
                return null;
            }
        }

        treeNode.childNodes = childNodes;
        treeNode.hasCaret = childNodes.length > 0;

        return treeNode;
    }

    /**
     * Returns wether or not the given name matches the current filter.
     */
    private _matchesFilter(name: string): boolean {
        if (!this.state.filter) {
            return true;
        }

        return name.toLowerCase().includes(this.state.filter);
    }

    /**
     * Traverses all the tree nodes starting from the given node array.
     */
    private _forEachNode(nodes: TreeNodeInfo<any>[], callback: (n: TreeNodeInfo<any>) => any): Nullable<TreeNodeInfo<any>> {
        for (const n of nodes) {
            if (callback(n) === true) {
                return n;
            }

            if (n.childNodes) {
                const result = this._forEachNode(n.childNodes, callback);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }
}
