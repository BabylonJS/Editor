import * as React from "react";
import Tree from "antd/lib/tree/Tree";
import {
    ContextMenu, Menu, MenuItem, MenuDivider, Classes, Tooltip,
    Position, HotkeysTarget, Hotkeys, Hotkey, InputGroup,
} from "@blueprintjs/core";

import { Nullable, Undefinable } from "../../../shared/types";

import { Node, Scene, Mesh, Light, Camera, TransformNode, InstancedMesh, AbstractMesh, MultiMaterial } from "babylonjs";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";
import { EditableText } from "../gui/editable-text";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";

import { Prefab } from "../prefab/prefab";

import { SceneSettings } from "../scene/settings";
import { SceneTools } from "../scene/tools";

export interface IGraphProps {
    editor: Editor;
    scene?: Undefinable<Scene>;
}

export interface IGraphState {
    /**
     * Defines the list of all nodes to be draws in the editor.
     */
    nodes: JSX.Element[];
    /**
     * Defines the list of all expanded nodes.
     */
    expandedNodeIds?: Undefinable<string[]>;
    /**
     * Defines the list of all selected nodes.
     */
    selectedNodeIds?: Undefinable<string[]>;

    filter: string;
}

@HotkeysTarget
export class Graph extends React.Component<IGraphProps, IGraphState> {
    private _editor: Editor;
    private _firstUpdate: boolean = true;
    private _filter: string = "";

    /**
     * Defines the last selected node in the graph.
     */
    public lastSelectedNode: Nullable<Node> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IGraphProps) {
        super(props);

        this._editor = props.editor;
        if (!props.scene) { this._editor.graph = this; }

        this.state = { nodes: [], expandedNodeIds: [], selectedNodeIds: [], filter: "" };
    }

    /**
     * Renders the component.
     */
    public render(): JSX.Element {
        if (!this.state.nodes.length) { return null!; }

        return (
            <>
                <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={(e) => this._handleFilterChanged(e.target.value)}></InputGroup>
                <div style={{ width: "100%", height: "calc(100% - 55px)", overflow: "auto" }}>
                    <Tree.DirectoryTree
                        className="draggable-tree"
                        draggable={true}
                        multiple={true}
                        showIcon={true}
                        checkable={false}
                        key={"Graph"}
                        style={{ height: "calc(100% - 32px)" }}
                        blockNode={true}
                        expandedKeys={this.state.expandedNodeIds}
                        onExpand={(k) => this._handleExpandedNode(k as string[])}
                        onRightClick={(e) => this._handleNodeContextMenu(e.event, e.node)}
                        onSelect={(k) => this._handleSelectedNodes(k as string[])}
                        autoExpandParent={false}
                        selectedKeys={this.state.selectedNodeIds}
                        expandAction="doubleClick"
                        onDragEnter={(n) => this._handleDragEnter(n)}
                        onDrop={(i) => this._handleDrop(i)}
                    >
                        {this.state.nodes}
                    </Tree.DirectoryTree>
                </div>
            </>
        );
    }

    /**
     * Renders the hotkeys for the graph component;
     */
    public renderHotkeys(): JSX.Element {
        return (
            <Hotkeys>
                <Hotkey
                    group="graph-shortcuts"
                    combo="del"
                    label="Delete the selected node(s)."
                    onKeyDown={() => this._handleRemoveNode()}
                />
            </Hotkeys>
        );
    }

    /**
     * Refreshes the graph.
     * @param done called on the refresh process finished.
     */
    public refresh(done?: Undefinable<() => void>): void {
        const nodes = this._parseScene();
        const expandedNodeIds = this._firstUpdate ? this.state.expandedNodeIds : undefined;

        this.setState({ nodes, expandedNodeIds }, () => done && done());
        this._firstUpdate = false;
    }

    /**
     * Clears the graph.
     */
    public clear(): void {
        this.setState({ nodes: [], selectedNodeIds: [], expandedNodeIds: [] });
        this._firstUpdate = true;
    }

    /**
     * Selecs the given node in the graph.
     * @param node the node to select in the graph.
     */
    public setSelected(node: Node): void {
        let expanded = this.state.expandedNodeIds?.slice();
        if (expanded) {
            let parent = node.parent;
            while (parent) {
                const pid = parent.id;
                if (expanded.indexOf(pid) === -1) { expanded.push(pid); }

                parent = parent.parent;
            }
        }

        this.lastSelectedNode = node;
        this.setState({
            selectedNodeIds: [node.id],
            expandedNodeIds: expanded ?? undefined,
        });
    }

    /**
     * Refreshes the graph and selects the given node. Mainly used by assets.
     * @param node the node to select in the graph.
     */
    public refreshAndSelect(node: Node): void {
        this.refresh(() => {
            setTimeout(() => this.setSelected(node));
        });
    }

    /**
     * Clones the given node.
     * @param node the node to clone.
     */
    public cloneNode(node: Node): Nullable<Node> {
        let clone: Nullable<Node> = null;
        
        if (node instanceof Mesh) { clone = node.clone(node.name, node.parent, false, true); }
        else if (node instanceof Light) { clone = node.clone(node.name); }
        else if (node instanceof Camera) { clone = node.clone(node.name); }
        else if (node instanceof TransformNode) { clone = node.clone(node.name, node.parent, false); }

        if (clone) {
            clone.id = Tools.RandomId();
            clone.metadata = Tools.CloneObject(clone.metadata);
            
            const descendants = clone.getDescendants(false);
            descendants.forEach((d) => {
                d.id = Tools.RandomId();
                d.metadata = Tools.CloneObject(d.metadata);
            });
        }

        return clone;
    }

    /**
     * Removes the given node.
     * @param node the node to remove.
     */
    public removeNode(node: Node): void {
        let removeFunc: Nullable<(n: Node) => void> = null;
        let addFunc: Nullable<(n: Node) => void> = null;
        let caller: any = this._editor.scene!;

        if (node instanceof AbstractMesh) {
            removeFunc = this._editor.scene!.removeMesh;
            addFunc = this._editor.scene!.addMesh;
        } else if (node instanceof InstancedMesh) {
            removeFunc = node.sourceMesh.removeInstance;
            addFunc = node.sourceMesh.addInstance;
            caller = node.sourceMesh;
        } else if (node instanceof Light) {
            removeFunc = this._editor.scene!.removeLight;
            addFunc = this._editor.scene!.addLight;
        } else if (node instanceof Camera) {
            removeFunc = this._editor.scene!.removeCamera;
            addFunc = this._editor.scene!.addCamera;
        } else if (node instanceof TransformNode) {
            removeFunc = this._editor.scene!.removeTransformNode;
            addFunc = this._editor.scene!.addTransformNode;
        }

        if (!removeFunc || !addFunc) { return; }

        const parent = node.parent;
        const descendants = node.getDescendants();
        
        undoRedo.push({
            common: () => {
                this._editor.removedNodeObservable.notifyObservers(node);
                this.refresh();
            },
            redo: () => {
                node.parent = null;
                removeFunc?.call(caller, node);
                if (node instanceof InstancedMesh) { node.sourceMesh.removeInstance(node); }
                descendants.forEach((d) => d.parent = parent);
            },
            undo: () => {
                addFunc?.call(caller, node);
                if (node instanceof InstancedMesh) { node.sourceMesh.addInstance(node); }
                node.parent = parent;
                descendants.forEach((d) => d.parent = node);
            },
        });
    }

    /**
     * Called on the user wants to filter the nodes.
     */
    private _handleFilterChanged(filter: string): void {
        this._filter = filter;
        this.setState({ filter, nodes: this._parseScene() });
    }

    /**
     * Returns the game instance used by the graph.
     */
    private get _scene(): Scene {
        return this.props.scene ?? this._editor.scene!;
    }

    /**
     * Recursively parses the stage to adds the nodes to the props.
     */
    private _parseScene(): JSX.Element[] {
        const nodes = this._scene.rootNodes.map((n) => this._parseNode(n)).filter((n) => n !== null);

        return [
            <Tree.TreeNode
                active={true}
                expanded={true}
                title={<span>Scene</span>}
                key="scene"
                isLeaf={true}
                icon={<Icon src="camera-retro.svg" />}
            />
        ].concat(nodes as JSX.Element[]);
    }

    /**
     * Parses the given node and returns the new treenode object.
     * @param node the node to parse.
     */
    private _parseNode(node: Node): Nullable<JSX.Element> {
        if (node instanceof Mesh && node._masterMesh) { return null; }
        if (node === SceneSettings.Camera) { return null; }

        node.metadata = node.metadata ?? { };
        if (node instanceof AbstractMesh) {
            node.metadata.isPickable = node.metadata.isPickable ?? node.isPickable;
            node.isPickable = true;

            node.subMeshes?.forEach((sm) => sm._id = sm._id ?? Tools.RandomId());
        }

        node.id = node.id ?? Tools.RandomId();
        node.name = node.name ?? "Node";

        const ctor = Tools.GetConstructorName(node);
        const name = node.name ?? ctor;

        const style: React.CSSProperties = { marginLeft: "5px", textOverflow: "ellipsis", whiteSpace: "nowrap" };
        if (node.metadata.doNotExport) {
            style.color = "grey";
            style.textDecoration = "line-through";
        }

        // Filter
        let matchesFilter: boolean = true;
        if (this._filter) {
            const all = [node].concat(node.getDescendants());
            matchesFilter = all.find((c) => (c.name ?? Tools.GetConstructorName(c)).toLowerCase().indexOf(this._filter.toLowerCase()) !== -1) !== undefined;
        }

        let children: JSX.Element[] = [];
        if (matchesFilter) {
            children = node.getChildren().map((c: Node) => this._parseNode(c)).filter((n) => n !== null) as JSX.Element[];
        }

        return (
            <Tree.TreeNode
                active={true}
                expanded={true}
                title={
                    <Tooltip
                        content={<span>{ctor}</span>}
                        position={Position.RIGHT}
                        usePortal={false}
                    >
                        <span style={style}>{name}</span>
                    </Tooltip>
                }
                key={node.id}
                isLeaf={!node.getChildren().length}
                icon={<Icon src={this._getIcon(node)} />}
            >
                {children}
            </Tree.TreeNode>
        );
    }

    /**
     * Returns the appropriate icon according to the given node type.
     * @param node the node reference.
     */
    private _getIcon(node: Node): string {
        if (node instanceof AbstractMesh) { return "vector-square.svg"; }
        if (node instanceof Light) { return "lightbulb.svg"; }
        if (node instanceof Camera) { return "camera.svg"; }
        return "clone.svg";
    }

    /**
     * Called on the user right-clicks on a node.
     * @param graphNode the node being right-clicked in the tree.
     * @param e the event object coming from react.
     */
    private _handleNodeContextMenu(e: React.MouseEvent, graphNode: any): void {
        const node = this._getNodeById(graphNode.key);
        if (!node || node.doNotSerialize || node === SceneSettings.Camera) { return; }

        const name = node.name ?? Tools.GetConstructorName(node);

        const subMeshesItems: JSX.Element[] = [];
        if (node instanceof Mesh && node.subMeshes?.length && node.subMeshes.length > 1) {
            const multiMaterial = node.material && node.material instanceof MultiMaterial ? node.material : null;

            node.subMeshes.forEach((sm, index) => {
                const material = multiMaterial && sm.getMaterial();
                const text = material ? (material.name ?? Tools.GetConstructorName(material)) : `Sub Mesh "${index}`;
                const extraMenu = <MenuItem id={`${node.id}-${index}`} text={text} icon={<Icon src="vector-square.svg" />} onClick={() => this._editor.selectedSubMeshObservable.notifyObservers(sm)} />;
                subMeshesItems.push(extraMenu);
            });
        }

        let mergeMeshesItem: React.ReactNode;
        if (this.state.selectedNodeIds) {
            const all = this.state.selectedNodeIds.map((id) => this._getNodeById(id));
            const notAllMeshes = all.find((n) => !(n instanceof Mesh));
            if (!notAllMeshes && all.length > 1) {
                mergeMeshesItem = (
                    <>
                        <MenuDivider />
                        <MenuItem text="Merge Meshes..." onClick={() => SceneTools.MergeMeshes(this._editor, all as Mesh[])} />
                    </>
                )
            }
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <EditableText
                    value={name}
                    multiline={true}
                    confirmOnEnterKey={true}
                    selectAllOnFocus={true}
                    className={Classes.FILL}
                    onConfirm={(v) => {
                        const oldName = node.name;
                        undoRedo.push({
                            common: () => this.refresh(),
                            redo: () => node.name = v,
                            undo: () => node.name = oldName,
                        });
                    }}
                />
                <MenuDivider />
                <MenuItem text="Clone" icon={<Icon src="clone.svg" />} onClick={() => this._handleClone()} />
                <MenuDivider />
                <MenuItem text="Create Prefab..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(this._editor, node as Mesh)} />
                {mergeMeshesItem}
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveNode()} />
                {subMeshesItems.length ? <MenuDivider title="Sub-Meshes:" /> : undefined}
                {subMeshesItems}
            </Menu>,
            { left: e.clientX, top: e.clientY }
        );

        const selectedNodeIds = this.state.selectedNodeIds?.slice() ?? [];
        if (selectedNodeIds.indexOf(graphNode.key) !== -1) { return; }
        
        if (e.ctrlKey) {
            selectedNodeIds.push(graphNode.key);
            this.setState({ selectedNodeIds });
        } else {
            this.setState({ selectedNodeIds: [graphNode.key] });
        }
    }

    /**
     * Removes the given node from the graph and destroys its data.
     */
    private _handleRemoveNode(): void {
        if (!this.state.selectedNodeIds) { return; }
        this.state.selectedNodeIds.forEach((id) => {
            const node = this._getNodeById(id);
            if (!node) { return; }

            this.removeNode(node);
        });
    }

    /**
     * Clones all selected nodes.
     */
    private _handleClone(): void {
        if (!this.state.selectedNodeIds) { return; }
        this.state.selectedNodeIds.forEach((id) => {
            const node = this._getNodeById(id);
            if (!node) { return; }

            this.cloneNode(node);
        });

        this.refresh();
    }

    /**
     * Called on the user selects keys in the graph.
     */
    private _handleSelectedNodes(keys: string[]): void {
        this.setState({ selectedNodeIds: keys });

        const id = keys[keys.length - 1];
        if (id === "scene") {
            this._editor.selectedSceneObservable.notifyObservers(this._editor.scene!);
            return;
        }

        const lastSelected = this._getNodeById(id);
        if (!lastSelected) { return; }

        this._editor.selectedNodeObservable.notifyObservers(lastSelected, undefined, this);
        this.lastSelectedNode = lastSelected;
    }

    /**
     * Called on the user expands given node keys.
     */
    private _handleExpandedNode(keys: string[]): void {
        this.setState({ expandedNodeIds: keys });
    }

    /**
     * Called on the drag event tries to enter in an existing node.
     */
    // @ts-ignore
    private _handleDragEnter(n: any): void {
        // Nothing to do now.
        // console.log(n);
    }

    /**
     * Called on a node is dropped in the graph.
     */
    private _handleDrop(info: any): void {
        if (!this.state.selectedNodeIds) { return; }

        const source = this._getNodeById(info.dragNode.key);
        if (!source) { return; }

        const target = this._getNodeById(info.node.key);
        if (!target) { return; }

        const all = this.state.selectedNodeIds.map((s) => this._getNodeById(s)).filter((n) => n) as Node[];
        if (info.node.dragOver) {
            all.forEach((n) => n.parent = target);
        } else {
            all.forEach((n) => n.parent = target.parent);
        }

        this.refresh();
    }

    /**
     * Returns the node in the stage identified by the given id.
     * @param id the id of the node to find.
     */
    private _getNodeById(id: string): Undefinable<Node> {
        const all = Tools.getAllSceneNodes(this._editor.scene!);
        return all.find((c) => c.id === id);
    }
}
