import * as React from "react";
import Tree from "antd/lib/tree/Tree";
import {
    ContextMenu, Menu, MenuItem, MenuDivider, Classes, Tooltip,
    Position, HotkeysTarget, Hotkeys, Hotkey, InputGroup, FormGroup,
    Switch, ButtonGroup, Button, Popover,
} from "@blueprintjs/core";

import { Nullable, Undefinable } from "../../../shared/types";

import {
    Node, Scene, Mesh, Light, Camera, TransformNode, InstancedMesh, AbstractMesh,
    MultiMaterial, IParticleSystem, ParticleSystem, Sound,
} from "babylonjs";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";
import { EditableText } from "../gui/editable-text";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";

import { Prefab } from "../prefab/prefab";

import { SceneSettings } from "../scene/settings";
import { SceneTools } from "../scene/tools";

import { SoundAssets } from "../assets/sounds";

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
    /**
     * Defines the current filter to search nodes.
     */
    filter: string;

    /**
     * Defines wether or not the graphs options should be drawn.
     */
    showOptions: boolean;
    /**
     * Defines wether or not the instances should be shown in the graph.
     */
    showInstances: boolean;
    /**
     * Defines wether or not the lights should be shown in the graph.
     */
    showLights: boolean;
}

@HotkeysTarget
export class Graph extends React.Component<IGraphProps, IGraphState> {
    private _editor: Editor;
    private _firstUpdate: boolean = true;
    private _filter: string = "";

    /**
     * Defines the last selected node in the graph.
     */
    public lastSelectedObject: Nullable<Node | IParticleSystem | Sound> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IGraphProps) {
        super(props);

        this._editor = props.editor;
        if (!props.scene) { this._editor.graph = this; }

        this.state = {
            nodes: [], expandedNodeIds: [], selectedNodeIds: [], filter: "",
            showOptions: false, showInstances: true, showLights: true,
        };
    }

    /**
     * Renders the component.
     */
    public render(): JSX.Element {
        if (!this.state.nodes.length) { return null!; }

        return (
            <>
                <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={(e) => this._handleFilterChanged(e.target.value)}></InputGroup>
                <Popover
                    fill={true}
                    isOpen={this.state.showOptions}
                    position={Position.BOTTOM}
                    popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                    usePortal={true}
                    inheritDarkTheme={true}
                    onClose={() => this.setState({ showOptions: false })}
                    content={
                        <FormGroup label="Graph" labelInfo="Options" >
                            <Switch label="Show Instances" checked={this.state.showInstances} onChange={(e) => this.setState({ showInstances: e.currentTarget.checked }, () => this.refresh())} />
                            <Switch label="Show Lights" checked={this.state.showLights} onChange={(e) => this.setState({ showLights: e.currentTarget.checked }, () => this.refresh())} />
                        </FormGroup>
                    }
                >
                    <ButtonGroup fill={true}>
                        <Button text="Options..." onClick={() => this.setState({ showOptions: true })} />
                    </ButtonGroup>
                </Popover>
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
                        expandedKeys={this.state.expandedNodeIds ?? []}
                        onExpand={(k) => this._handleExpandedNode(k as string[])}
                        onRightClick={(e) => this._handleNodeContextMenu(e.event, e.node)}
                        onSelect={(k) => this._handleSelectedNodes(k as string[])}
                        autoExpandParent={false}
                        selectedKeys={this.state.selectedNodeIds ?? []}
                        expandAction="doubleClick"
                        onDragEnter={(n) => this._handleDragEnter(n)}
                        onDragStart={(n) => this._handleDragStart(n)}
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
                    onKeyDown={() => this._handleRemoveObject()}
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
    public setSelected(node: Node | IParticleSystem | Sound): void {
        let expanded = this.state.expandedNodeIds?.slice();
        if (expanded) {
            let parent: Nullable<Node>;
            if (node instanceof Node) {
                parent = node.parent;
            } else if (node instanceof Sound) {
                parent = node["_connectedTransformNode"];
            } else {
                parent = node.emitter as AbstractMesh;
            }

            while (parent) {
                const pid = parent.id;
                if (expanded.indexOf(pid) === -1) { expanded.push(pid); }

                parent = parent.parent;
            }
        }

        this.lastSelectedObject = node;

        this.setState({
            selectedNodeIds: [node instanceof Sound ? node.metadata?.id : node.id],
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
    public cloneObject(node: Node | IParticleSystem): Nullable<Node | IParticleSystem> {
        let clone: Nullable<Node | IParticleSystem> = null;
        
        if (node instanceof Mesh) { clone = node.clone(node.name, node.parent, false, true); }
        else if (node instanceof Light) { clone = node.clone(node.name); }
        else if (node instanceof Camera) { clone = node.clone(node.name); }
        else if (node instanceof TransformNode) { clone = node.clone(node.name, node.parent, false); }
        else if (node instanceof ParticleSystem) { clone = node.clone(node.name, node.emitter); }

        if (clone) {
            clone.id = Tools.RandomId();

            if (clone instanceof Node) {
                clone.metadata = Tools.CloneObject(clone.metadata);

                const descendants = clone.getDescendants(false);
                descendants.forEach((d) => {
                    d.id = Tools.RandomId();
                    d.metadata = Tools.CloneObject(d.metadata);
                });
            }
        }

        return clone;
    }

    /**
     * Removes the given node.
     * @param node the node to remove.
     */
    public removeObject(node: Node | IParticleSystem | Sound, refresh: boolean = true): void {
        let removeFunc: Nullable<(n: Node | IParticleSystem | Sound) => void> = null;
        let addFunc: Nullable<(n: Node | IParticleSystem | Sound) => void> = null;
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
        } else if (node instanceof ParticleSystem) {
            removeFunc = this._editor.scene!.removeParticleSystem;
            addFunc = this._editor.scene!.addParticleSystem;
        } else if (node instanceof Sound) {
            removeFunc = this._editor.scene!.mainSoundTrack.RemoveSound;
            addFunc = this._editor.scene!.mainSoundTrack.AddSound;
            caller = this._editor.scene!.mainSoundTrack;
        }

        if (!removeFunc || !addFunc) { return; }

        const parent = node instanceof Node ? node.parent :
                       node instanceof Sound ? node["_connectedTransformNode"] :
                       node.emitter as AbstractMesh;
        const descendants = node instanceof Node ? node.getDescendants() : [];
        const particleSystems = this._editor.scene!.particleSystems.filter((ps) => ps.emitter === node);
        const shadowLights = this._editor.scene!.lights.filter((l) => l.getShadowGenerator()?.getShadowMap()?.renderList)
                                                       .filter((l) => l.getShadowGenerator()!.getShadowMap()!.renderList!.indexOf(node as AbstractMesh) !== -1);
        
        undoRedo.push({
            common: () => {
                if (refresh) {
                    this.refresh();
                }
                refresh = true;
            },
            redo: () => {
                if (node instanceof Node) { node.parent = null; }
                
                removeFunc?.call(caller, node);
                
                if (node instanceof Sound) {
                    if (parent) { node.detachFromMesh(); }
                    this._editor.assets.forceRefresh(SoundAssets);
                }

                if (node instanceof InstancedMesh) { node.sourceMesh.removeInstance(node); }
                if (node instanceof Node) { descendants.forEach((d) => d.parent = parent); }

                particleSystems.forEach((ps) => this._editor.scene!.removeParticleSystem(ps));

                if (node instanceof Node) {
                    this._editor.removedNodeObservable.notifyObservers(node);
                } else if (node instanceof Sound) {
                    this._editor.removedSoundObservable.notifyObservers(node);
                } else {
                    this._editor.removedParticleSystemObservable.notifyObservers(node);
                }

                shadowLights.forEach((sl) => {
                    const renderList = sl.getShadowGenerator()?.getShadowMap()?.renderList;
                    if (renderList) {
                        const index = renderList.indexOf(node as AbstractMesh);
                        if (index !== -1) {
                            renderList.splice(index, 1);
                        }
                    }
                });
            },
            undo: () => {
                addFunc?.call(caller, node);

                if (node instanceof InstancedMesh) { node.sourceMesh.addInstance(node); }
                if (node instanceof Node) {
                    node.parent = parent;
                    descendants.forEach((d) => d.parent = node);
                }
                if (node instanceof Sound) {
                    if (parent) { node.attachToMesh(parent); }
                    this._editor.assets.forceRefresh(SoundAssets);
                }

                particleSystems.forEach((ps) => this._editor.scene!.addParticleSystem(ps));

                if (node instanceof Node) {
                    this._editor.addedNodeObservable.notifyObservers(node);
                } else if (node instanceof Sound) {
                    this._editor.addedSoundObservable.notifyObservers(node);
                } else {
                    this._editor.addedParticleSystemObservable.notifyObservers(node);
                }

                shadowLights.forEach((sl) => {
                    sl.getShadowGenerator()?.getShadowMap()?.renderList?.push(node as AbstractMesh);
                });
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

        const scene = (
            <Tree.TreeNode
                active={true}
                expanded={true}
                title={<span>Scene</span>}
                key="__editor__scene__"
                isLeaf={true}
                icon={<Icon src="camera-retro.svg" />}
            />
        );
        
        const soundsChildren = this._editor.scene!.mainSoundTrack.soundCollection.filter((s) => !s.spatialSound).map((s) => {
            s.metadata = s.metadata ?? { };
            if (!s.metadata.id) { s.metadata.id = Tools.RandomId(); }

            return (
                <Tree.TreeNode
                    active={true}
                    expanded={true}
                    title={<span>{s.name}</span>}
                    key={s.metadata.id}
                    isLeaf={true}
                    icon={<Icon src={s.isPlaying ? "volume-up.svg" : "volume-mute.svg"} />}
                    children={sounds}
                />
            );
        });

        const sounds = (
            <Tree.TreeNode
                active={true}
                expanded={true}
                title={<span>Sounds</span>}
                key="sounds"
                isLeaf={soundsChildren.length === 0}
                icon={<Icon src="volume-off.svg" />}
                children={soundsChildren}
            />
        );

        return [scene, sounds].concat(nodes as JSX.Element[]);
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

        // Filters
        if (node instanceof InstancedMesh && !this.state.showInstances) { return null; }
        if (node instanceof Light && !this.state.showLights) { return null; }

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

        // Search for particle systems.
        this._editor.scene!.particleSystems.forEach((ps) => {
            if (ps.emitter !== node) { return; }

            children.push(
                <Tree.TreeNode
                    active={true}
                    expanded={true}
                    title={
                        <Tooltip
                            content={<span>{Tools.GetConstructorName(ps)}</span>}
                            position={Position.RIGHT}
                            usePortal={false}
                        >
                            <span style={style}>{ps.name}</span>
                        </Tooltip>
                    }
                    key={ps.id}
                    isLeaf={true}
                    icon={<Icon src="wind.svg" />}
                ></Tree.TreeNode>
            );
        });

        // Search for sounds
        this._editor.scene!.mainSoundTrack.soundCollection.forEach((s) => {
            if (s["_connectedTransformNode"] !== node) { return; }

            s.metadata = s.metadata ?? { };
            if (!s.metadata.id) { s.metadata.id = Tools.RandomId(); }

            children.push(
                <Tree.TreeNode
                    active={true}
                    expanded={true}
                    title={
                        <Tooltip
                            content={<span>{Tools.GetConstructorName(s)}</span>}
                            position={Position.RIGHT}
                            usePortal={false}
                        >
                            <span style={style}>{s.name}</span>
                        </Tooltip>
                    }
                    key={s.metadata.id}
                    isLeaf={true}
                    icon={<Icon src={s.isPlaying ? "volume-up.svg" : "volume-mute.svg"} />}
                ></Tree.TreeNode>
            );
        });

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
                isLeaf={!children.length}
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
        let node = this._getNodeById(graphNode.key);

        if (!node || node === SceneSettings.Camera) { return; }
        if (node instanceof Node && node.doNotSerialize) { return; }

        const name = node.name ?? Tools.GetConstructorName(node);

        const subMeshesItems: JSX.Element[] = [];
        if (node instanceof Mesh && node.subMeshes?.length && node.subMeshes.length > 1) {
            const multiMaterial = node.material && node.material instanceof MultiMaterial ? node.material : null;

            node.subMeshes.forEach((sm, index) => {
                const material = multiMaterial && sm.getMaterial();
                const text = material ? (material.name ?? Tools.GetConstructorName(material)) : `Sub Mesh "${index}`;
                const extraMenu = <MenuItem id={`${(node as Mesh)!.id}-${index}`} text={text} icon={<Icon src="vector-square.svg" />} onClick={() => this._editor.selectedSubMeshObservable.notifyObservers(sm)} />;
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
                    disabled={node instanceof Sound}
                    value={name}
                    multiline={true}
                    confirmOnEnterKey={true}
                    selectAllOnFocus={true}
                    className={Classes.FILL}
                    onConfirm={(v) => {
                        const oldName = node!.name;
                        undoRedo.push({
                            common: () => this.refresh(),
                            redo: () => node!.name = v,
                            undo: () => node!.name = oldName,
                        });
                    }}
                />
                <MenuDivider />
                <MenuItem text="Clone" disabled={node instanceof Sound} icon={<Icon src="clone.svg" />} onClick={() => this._handleCloneObject()} />
                <MenuDivider />
                <MenuItem text="Create Prefab..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(this._editor, node as Mesh, false)} />
                <MenuItem text="Create Prefab As..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(this._editor, node as Mesh, true)} />
                {mergeMeshesItem}
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveObject()} />
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
    private _handleRemoveObject(): void {
        if (!this.state.selectedNodeIds) { return; }

        const selectedNodeIds = this.state.selectedNodeIds.slice();

        this.state.selectedNodeIds.forEach((id) => {
            const node = this._getNodeById(id);
            if (!node) { return; }

            const index = selectedNodeIds.indexOf(id);
            if (index !== -1) {
                selectedNodeIds.splice(index, 1);
            }

            this.removeObject(node, false);
        });

        this.refresh(() => this.setState({ selectedNodeIds }));
    }

    /**
     * Clones all selected nodes.
     */
    private _handleCloneObject(): void {
        if (!this.state.selectedNodeIds) { return; }
        this.state.selectedNodeIds.forEach((id) => {
            const node = this._getNodeById(id);
            if (!node || node instanceof Sound) { return; }

            this.cloneObject(node);
        });

        this.refresh();
    }

    /**
     * Called on the user selects keys in the graph.
     */
    private _handleSelectedNodes(keys: string[]): void {
        this.setState({ selectedNodeIds: keys });

        const id = keys[keys.length - 1];
        if (id === "__editor__scene__") {
            this._editor.selectedSceneObservable.notifyObservers(this._editor.scene!);
            return;
        }

        // Node
        const lastSelected = this._getNodeById(id);
        if (!lastSelected) { return; }

        if (lastSelected instanceof Node) {
            this._editor.selectedNodeObservable.notifyObservers(lastSelected, undefined, this);
        } else if (lastSelected instanceof Sound) {
            this._editor.selectedSoundObservable.notifyObservers(lastSelected, undefined, this);
        } else {
            this._editor.selectedParticleSystemObservable.notifyObservers(lastSelected, undefined, this);
        }
        this.lastSelectedObject = lastSelected;
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
    private _handleDragEnter(_: any): void {
        // Nothing to do now.
    }

    /**
     * Called on the user starts dragging a node.
     */
    private _handleDragStart(info: any): void {
        const draggedNodeId = info.node?.key;
        if (!draggedNodeId) { return; }

        if (info.event.ctrlKey) {
            if (this.state.selectedNodeIds?.indexOf(draggedNodeId) === -1) {
                this.setState({ selectedNodeIds: this.state.selectedNodeIds.slice().concat([draggedNodeId]) });
            }
        }
    }

    /**
     * Called on a node is dropped in the graph.
     */
    private _handleDrop(info: any): void {
        if (!this.state.selectedNodeIds) { return; }

        const source = this._getNodeById(info.dragNode.key);
        if (!source) { return; }

        const all = this.state.selectedNodeIds.map((s) => this._getNodeById(s)).filter((n) => n) as (Node | IParticleSystem | Sound)[];

        // Sound?
        if (info.node.key === "sounds") {
            all.filter((a) => a instanceof Sound).forEach((s: Sound) => {
                s.detachFromMesh();
                s.spatialSound = false;
            });

            return this.refresh();
        }

        const target = this._getNodeById(info.node.key);
        if (!target || !(target instanceof Node)) { return; }

        if (info.node.dragOver) {
            all.forEach((n) => {
                if (n instanceof Node) {
                    return (n.parent = target);
                }

                if (target instanceof AbstractMesh) {
                    if (n instanceof ParticleSystem) {
                        n.emitter = target;
                    } else if (n instanceof Sound) {
                        n.attachToMesh(target);
                        n.spatialSound = true;
                    }
                }
            });
        } else {
            all.forEach((n) => {
                if (n instanceof Node) {
                    return (n.parent = target.parent);
                }

                if (target.parent instanceof AbstractMesh) {
                    if (n instanceof ParticleSystem) {
                        n.emitter = target.parent;
                    } else if (n instanceof Sound) {
                        n.attachToMesh(target.parent);
                        n.spatialSound = true;
                    }
                }
            });
        }

        this.refresh();
    }

    /**
     * Returns the node in the stage identified by the given id.
     * @param id the id of the node to find.
     */
    private _getNodeById(id: string): Undefinable<Node | IParticleSystem | Sound> {
        const all = Tools.getAllSceneNodes(this._editor.scene!);

        const node = all.find((c) => c.id === id);
        if (node) { return node; }
        
        const ps = this._editor.scene!.getParticleSystemByID(id);
        if (ps) { return ps; }

        const sound = this._editor.scene!.mainSoundTrack.soundCollection.find((s) => s.metadata?.id === id);
        if (sound) { return sound; }

        return undefined;
    }
}
