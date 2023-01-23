import { IStringDictionary, Nullable } from "../../../shared/types";

import * as React from "react";
import {
    Classes, InputGroup, Tag, Tree, TreeNodeInfo, Icon as BPIcon, ContextMenu, Menu, MenuItem,
    HotkeysTarget2, IHotkeyProps,
} from "@blueprintjs/core";

import { IParticleSystem, Mesh, Node, ReflectionProbe, Sound } from "babylonjs";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";

import { Tools } from "../tools/tools";

import { SceneSettings } from "../scene/settings";

import { GraphIcon } from "./graph/icon";
import { GraphLabel } from "./graph/label";
import { GraphContextMenu } from "./graph/context-menu/menu";

import { moveNodes } from "./graph/tools/move";
import { removeNodes } from "./graph/tools/remove";
import { isAbstractMesh, isNode, isIParticleSystem, isReflectionProbe, isScene, isSound } from "./graph/tools/tools";

import { GraphReferenceUpdater } from "./graph/reference-updater";

export interface _IDragAndDroppedItem {
    nodeId: string;
    onDropInInspector: (ev: React.DragEvent<HTMLElement>, object: any, property: string) => Promise<void>;
}

export interface IGraphProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export interface IGraphState {
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

export class Graph extends React.Component<IGraphProps, IGraphState> {
    /**
     * Defines the reference to the last selected object.
     */
    public lastSelectedObject: any;

    private _nodes: TreeNodeInfo<any>[] = [];
    private _previousNodes: TreeNodeInfo<any>[] = [];

    private _expandedNodes: TreeNodeInfo<any>[] = [];

    private _graphLabelRefs: IStringDictionary<Nullable<GraphLabel>> = {};

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IGraphProps) {
        super(props);

        props.editor.graph = this;

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
            <HotkeysTarget2 hotkeys={this._hotKeys}>
                {({ handleKeyDown, handleKeyUp }) => (
                    <div
                        tabIndex={0}
                        onKeyUp={handleKeyUp}
                        onKeyDown={handleKeyDown}
                        style={{ outline: "none" }}
                    >
                        <div style={{ width: "100%", overflow: "hidden" }}>
                            <InputGroup
                                type="search"
                                placeholder="Search..."
                                className={Classes.FILL}
                                style={{ marginTop: "5px", marginBottom: "5px" }}
                                onChange={(e) => this._handleSearchChange(e.target.value)}
                                leftIcon={<BPIcon icon="search" style={{ margin: "12px" }} />}
                            ></InputGroup>
                        </div>
                        <div
                            style={{
                                overflow: "auto",
                                height: "calc(100% - 40px)",
                            }}
                            onDrop={(ev) => {
                                moveNodes(this.props.editor, this.state.selectedNodes.map((n) => n.nodeData), null, ev.shiftKey);
                            }}
                            onContextMenu={(e) => this._handleRootContextMenu(e)}
                        >
                            <Tree
                                contents={this.state.nodes}
                                onNodeExpand={(n) => this._handleNodeExpand(n)}
                                onNodeCollapse={(n) => this._handleNodeCollapse(n)}
                                onNodeClick={(n, _, e) => this._handleNodeClick(n, e)}
                                onNodeDoubleClick={(n) => this._handleNodeDoubleClick(n)}
                                onNodeContextMenu={(n, _, e) => this._handleNodeContextMenu(n, e)}
                            />
                        </div>
                    </div>
                )}
            </HotkeysTarget2>
        );
    }

    /**
     * Removes the given object from the scene graph.
     * @param node defines the reference to the object to remove.
     */
    public removeObject(node: any): void {
        removeNodes(this.props.editor, [node]);
    }

    /**
     * Resizes the component.
     */
    public resize(): void {
        // ...
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
     * Called on the user right-clicks on the graph panel but not on a node.
     */
    private _handleRootContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        ContextMenu.show((
            <Menu className={Classes.DARK}>
                <MenuItem text="Add" icon={<Icon src="plus.svg" />}>
                    {this.props.editor.mainToolbar.getAddMenuItems()}
                </MenuItem>
                <MenuItem text="Add Mesh" icon={<Icon src="plus.svg" />}>
                    {this.props.editor.mainToolbar.getAddMeshMenuItem()}
                </MenuItem>
            </Menu>
        ), {
            top: event.clientY,
            left: event.clientX,
        });
    }

    /**
     * Called on the user right-clicks on a node.
     */
    private _handleNodeContextMenu(node: TreeNodeInfo<any>, event: React.MouseEvent<HTMLElement, MouseEvent>): void {
        event.stopPropagation();

        if (!node.isSelected) {
            this._handleNodeClick(node, event);
        }

        if (node.nodeData && !isScene(node.nodeData)) {
            GraphContextMenu.Show(event.nativeEvent, this.props.editor, node.nodeData!);
        }
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

        if (node.nodeData) {
            this.lastSelectedObject = node.nodeData;
            this.props.editor.selectedNodeObservable.notifyObservers(node.nodeData!, undefined, this);
        }

        this.update();
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
     * Sets the given object selected in the graph.
     * @param object defines the reference to the object to set selected in the graph.
     * @param appendToSelected defines wether or not the object should be added to the currently selected node(s) in the graph.
     */
    public setSelected(object: any, appendToSelected?: boolean): void {
        if (!appendToSelected) {
            this._forEachNode(this.state.nodes, (n) => n.isSelected = false);
        }

        const node = this._forEachNode(this.state.nodes, (n) => n.nodeData === object);
        if (node) {
            node.isSelected = true;

            this.lastSelectedObject = node.nodeData;

            if (appendToSelected) {
                this.state.selectedNodes.push(node);
            } else {
                this.setState({ selectedNodes: [node] });
            }
        }

        // Expand all parents
        let parent = object.parent;
        while (parent) {
            const node = this._forEachNode(this.state.nodes, (n) => n.nodeData === parent);
            if (node) {
                node.isExpanded = true;
            }

            parent = parent.parent;
        }

        this.update();
    }

    /**
     * Parses all the scene's nodes and returns the array of all root nodes.
     */
    private _parseSceneNodes(roots?: Node[]): TreeNodeInfo<any>[] {
        this._graphLabelRefs = {};

        this._nodes = [
            {
                label: "Scene",
                hasCaret: false,
                id: "__editor__scene__",
                nodeData: this.props.editor.scene,
                icon: <GraphIcon object={this.props.editor.scene} />,

                isSelected: this._previousNodes[0]?.isSelected ?? false,
            },
            {
                childNodes: [],
                label: "Sounds",
                id: "__editor__sounds__",
                icon: <Icon src="volume-up.svg" />,
                hasCaret: (this.props.editor.scene!.mainSoundTrack?.soundCollection?.length ?? 0) > 0,

                isSelected: this._previousNodes[1]?.isSelected ?? false,
                isExpanded: this._previousNodes[1]?.isExpanded ?? false,
            },
            {
                childNodes: [],
                label: "Reflection Probes",
                id: "__editor__reflection__probes",
                icon: <Icon src="reflection-probe.svg" />,
                hasCaret: (this.props.editor.scene!.reflectionProbes?.length ?? 0) > 0,

                isSelected: this._previousNodes[2]?.isSelected ?? false,
                isExpanded: this._previousNodes[2]?.isExpanded ?? false,
            },
        ];

        const result = this._nodes.slice();

        this._nodes[1].childNodes = this.props.editor.scene!.mainSoundTrack?.soundCollection?.filter((s) => !s.spatialSound).map((s) => this._recursivelyParseSceneNodes(s)).filter((s) => s) as TreeNodeInfo<any>[];
        this._nodes[2].childNodes = this.props.editor.scene!.reflectionProbes?.filter((rp) => !rp["_attachedMesh"]).map((rp) => this._recursivelyParseSceneNodes(rp)).filter((rp) => rp) as TreeNodeInfo<any>[];

        roots ??= this.props.editor.scene!.rootNodes;
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
    private _recursivelyParseSceneNodes(node: Node | Sound | ReflectionProbe | IParticleSystem): Nullable<TreeNodeInfo<any>> {
        if (node === SceneSettings.Camera) {
            return null;
        }

        if (isNode(node) && node.doNotSerialize) {
            return null;
        }

        if (isAbstractMesh(node) && node._masterMesh) {
            return null;
        }

        let id = "";
        let disabled = false;

        if (isNode(node) || isIParticleSystem(node)) {
            node.id ??= Tools.RandomId();
            node.name ??= Tools.GetConstructorName(node);
            id = node.id;
        } else if (isSound(node)) {
            node.metadata ??= {};
            node.metadata.id ??= Tools.RandomId();
            id = node.metadata.id;
        } else if (isReflectionProbe(node)) {
            node["metadata"] ??= {};
            node["metadata"].id ??= Tools.RandomId();
            id = node["metadata"].id;
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
        let secondaryLabel: React.ReactNode;
        if (isNode(node) && node.getClassName() === "Mesh" && node.metadata?._waitingUpdatedReferences) {
            secondaryLabel = (
                <Tag
                    intent="warning"
                    interactive
                    style={{ marginLeft: "10px" }}
                    onClick={(e) => new GraphReferenceUpdater(this.props.editor, node as Mesh).showContextMenu(e)}
                >...</Tag>
            );
        }

        // Create tree node
        const treeNode = {
            id,
            disabled,
            // childNodes,
            nodeData: node,
            secondaryLabel,
            // hasCaret: childNodes.length > 0,
            icon: <GraphIcon object={node} />,
            label: <GraphLabel ref={(r) => this._graphLabelRefs[id] = r} editor={this.props.editor} object={node} />,

            isSelected: existingNode?.isSelected ?? false,
            isExpanded: this.state.filter ? true : (existingNode?.isExpanded ?? false),
        } as TreeNodeInfo<any>;

        this._nodes.push(treeNode);

        // Parse children
        let childNodes: TreeNodeInfo<any>[] = [];
        if (isNode(node)) {
            childNodes = node.getChildren().map((c) => this._recursivelyParseSceneNodes(c)).filter((n) => n) as TreeNodeInfo<any>[];

            // Check for particle systems
            const particleSystems = this.props.editor.scene!.particleSystems?.filter((ps) => ps.emitter === node);
            particleSystems?.filter((ps) => this._matchesFilter(ps.name)).forEach((ps) => {
                const particleSystemNode = this._recursivelyParseSceneNodes(ps);
                if (particleSystemNode) {
                    childNodes.push(particleSystemNode);
                }
            });

            // Check for sounds
            const sounds = this.props.editor.scene!.mainSoundTrack?.soundCollection?.filter((s) => s.spatialSound && s["_connectedTransformNode"] === node);
            sounds?.filter((s) => this._matchesFilter(s.name)).forEach((s) => {
                const soundNode = this._recursivelyParseSceneNodes(s);
                if (soundNode) {
                    childNodes.push(soundNode);
                }
            });

            // Check for reflection probes
            const reflectionProbes = this.props.editor.scene!.reflectionProbes?.filter((rp) => rp["_attachedMesh"] === node);
            reflectionProbes?.filter((rp) => this._matchesFilter(rp.name)).forEach((rp) => {
                const reflectionProbeNode = this._recursivelyParseSceneNodes(rp);
                if (reflectionProbeNode) {
                    childNodes.push(reflectionProbeNode);
                }
            });

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

    /**
     * Defines the list of all hot keys.
     */
    private _hotKeys: IHotkeyProps[] = [
        // Delete
        {
            combo: "del",
            global: false,
            label: "Delete selected nodes",
            onKeyUp: () => {
                const selectedNodes = this.state.selectedNodes.map((n) => n.nodeData) as Node[];
                removeNodes(this.props.editor, selectedNodes);
            },
        },

        // Arrows
        {
            combo: "down",
            global: false,
            label: "Go to the next sibling",
            onKeyUp: () => this._handleHotKeyGoToSibling("next"),
        },
        {
            combo: "up",
            global: false,
            label: "Go to the previous sibling",
            onKeyUp: () => this._handleHotKeyGoToSibling("previous"),
        },
        {
            combo: "left",
            global: false,
            label: "Collapse selected node",
            onKeyUp: () => this._handleHotKeySetExpanded("collapsed"),
        },
        {
            combo: "right",
            global: false,
            label: "Expand selected node",
            onKeyUp: () => this._handleHotKeySetExpanded("expanded"),
        },

        // Rename
        {
            combo: "Enter",
            global: false,
            label: "Rename node",
            onKeyUp: () => this._handleHotKeyRename(),
        },
    ];

    /**
     * Handles the action on the graph when the user presses the Enter key to rename a node.
     */
    private _handleHotKeyRename(): void {
        const last = this.state.selectedNodes[this.state.selectedNodes.length - 1];
        if (!last || !isNode(last.nodeData)) {
            return;
        }

        this._graphLabelRefs[last.id]?.setState({ isRenaming: true });
    }

    /**
     * Handles the action on graph when the user presses the left of right keyboard arrows.
     */
    private _handleHotKeySetExpanded(type: "expanded" | "collapsed"): void {
        const last = this.state.selectedNodes[this.state.selectedNodes.length - 1];
        if (last) {
            const node = this._forEachNode(this.state.nodes, (n) => n.nodeData === last.nodeData);
            if (node) {
                node.isExpanded = type === "expanded";
                this.update();
            }
        }
    }

    /**
     * Handles the action on the graph when the user presses the up or down keyboard arrows.
     */
    private _handleHotKeyGoToSibling(type: "next" | "previous"): void {
        const lastSelected = this.state.selectedNodes[this.state.selectedNodes.length - 1];
        if (!lastSelected?.nodeData) {
            return;
        }

        const last = this._forEachNode(this.state.nodes, (n) => n.nodeData === lastSelected.nodeData);
        if (!last?.nodeData || !isNode(last.nodeData)) {
            return;
        }

        const parentIndex = this._nodes.findIndex((n) => n.childNodes && n.childNodes.find((n2) => n2.id === last.id));
        const parent = parentIndex > 0 ? this._nodes[parentIndex] : null;

        let effetiveParent = parent?.nodeData ?? null;
        let index = this._nodes.findIndex((n) => n.id === last.id);

        // Check last selected is the first child
        if (parent) {
            const parentNodes = parent.childNodes?.filter((n) => isNode(n.nodeData)) ?? [];
            const nodeIndex = parentNodes.findIndex((n) => n.id === last.id);

            if (type === "previous" && nodeIndex === 0) {
                return this._handleSetSelectedSibling(parent);
            }

            if (type === "next" && nodeIndex === parentNodes.length - 1) {
                effetiveParent = effetiveParent?.parent ?? null;
            }
        }

        if (type === "next" && last.isExpanded && last.childNodes?.find((n) => isNode(n.nodeData))) {
            effetiveParent = last.nodeData;
        }

        const step = (type === "next") ? 1 : -1;

        for (let i = index + step; (type === "next") ? (i < this._nodes.length) : (i >= 0); i += step) {
            const n = this._nodes[i];
            if (!n.nodeData || !isNode(n.nodeData)) {
                continue;
            }

            const sameParent = (n.nodeData.parent ?? null) === effetiveParent;
            if (!sameParent) {
                continue;
            }

            return this._handleSetSelectedSibling(n);
        }
    }

    private _handleSetSelectedSibling(node: TreeNodeInfo<any>): void {
        this._forEachNode(this.state.nodes, (n) => {
            n.isSelected = n.id === node.id;
        });

        this.state.selectedNodes.splice(0);
        this.state.selectedNodes.push(node);

        this.update();

        this.props.editor.inspector.setSelectedObject(node.nodeData);
    }
}
