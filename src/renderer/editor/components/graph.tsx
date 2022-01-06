import * as React from "react";
import Tree from "antd/lib/tree/Tree";
import {
    ContextMenu, Menu, MenuItem, MenuDivider, Classes, Tooltip,
    Position, InputGroup, FormGroup,
    Switch, ButtonGroup, Button, Popover, Pre, Intent, Code, Tag,
} from "@blueprintjs/core";

import { Nullable, Undefinable } from "../../../shared/types";

import {
    Node, Scene, Mesh, Light, Camera, TransformNode, InstancedMesh, AbstractMesh,
    MultiMaterial, IParticleSystem, ParticleSystem, Sound, SubMesh,
} from "babylonjs";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";
import { EditableText } from "../gui/editable-text";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";
import { IMeshMetadata } from "../tools/types";

import { Prefab } from "../prefab/prefab";

import { SceneSettings } from "../scene/settings";
import { SceneTools } from "../scene/tools";

import { SoundAssets } from "../assets/sounds";
import { IDragAndDroppedAssetComponentItem } from "../assets/abstract-assets";

export interface IGraphProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
    /**
     * Defines the reference to the scene to traverse.
     */
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

interface _ITreeDropInfo {
    event: React.MouseEvent;
    node: any;
    dragNode: any;
    dragNodesKeys: (string | number)[];
    dropPosition: number;
    dropToGap: boolean;
}

export class Graph extends React.Component<IGraphProps, IGraphState> {
    private _editor: Editor;
    private _firstUpdate: boolean = true;
    private _filter: string = "";

    private _copiedTransform: Nullable<AbstractMesh | Light | Camera> = null;

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
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Search..." onChange={(e) => this._handleFilterChanged(e.target.value)}></InputGroup>
                <Popover
                    fill={true}
                    isOpen={this.state.showOptions}
                    position={Position.BOTTOM}
                    popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                    usePortal={true}
                    inheritDarkTheme={true}
                    onClose={() => this.setState({ showOptions: false })}
                    lazy={true}
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
                <div style={{ width: "100%", height: "calc(100% - 60px)", overflow: "auto" }}>
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
            </div>
        );
    }

    /**
     * Refreshes the graph.
     * @param done called on the refresh process finished.
     */
    public refresh(done?: Undefinable<() => void>): void {
        const nodes = this._parseScene();
        const expandedNodeIds = this._firstUpdate ? undefined : this.state.expandedNodeIds;

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
     * @param appendToSelected defines wether or not the selected node should be appended to the currently selected nodes.
     */
    public setSelected(node: Node | IParticleSystem | Sound, appendToSelected?: boolean): void {
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

        const id = node instanceof Sound ? node.metadata?.id : node.id;

        this.setState({
            selectedNodeIds: (appendToSelected ? (this.state.selectedNodeIds ?? []) : []).concat([id]),
            expandedNodeIds: expanded ?? [],
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
     * Returns the list of all selected nodes (node, particle system, sound).
     */
    public getAllSelected(): (Node | IParticleSystem | Sound)[] {
        const result:(Node | IParticleSystem | Sound)[] = [];
        const selectedIds = this.state.selectedNodeIds ?? [];
        selectedIds.forEach((sid) => {
            const node = this._getNodeById(sid);
            if (node) {
                result.push(node);
            }
        });

        return result;
    }

    /**
     * Clones the given node.
     * @param node the node to clone.
     */
    public cloneObject(node: Node | IParticleSystem): Nullable<Node | IParticleSystem> {
        let clone: Nullable<Node | IParticleSystem> = null;
        
        if (node instanceof Mesh) {
            const clonedMesh = node.clone(node.name, node.parent, false, true);

            if (node.skeleton) {
                let id = 0;
                while (this._editor.scene!.getSkeletonById(id as any)) {
                    id++;
                }

                clonedMesh.skeleton = node.skeleton.clone(node.skeleton.name, id as any);
            }

            if (clonedMesh.parent) { clonedMesh.physicsImpostor?.forceUpdate(); }
            clonedMesh.physicsImpostor?.sleep();

            clone = clonedMesh;
        }
        else if (node instanceof Light) { clone = node.clone(node.name); }
        else if (node instanceof Camera) { clone = node.clone(node.name); }
        else if (node instanceof TransformNode) { clone = node.clone(node.name, node.parent, false); }
        else if (node instanceof ParticleSystem) { clone = node.clone(node.name, node.emitter); }

        if (clone) {
            clone.id = Tools.RandomId();

            if (clone instanceof Node) {
                const metadata = { ...clone.metadata } as IMeshMetadata;
                delete metadata._waitingUpdatedReferences;

                clone.metadata = Tools.CloneObject(metadata);

                const descendants = clone.getDescendants(false);
                descendants.forEach((d) => {
                    d.id = Tools.RandomId();
                    d.metadata = Tools.CloneObject(d.metadata);
                });

                // Notify
                this._editor.selectedNodeObservable.notifyObservers(clone);
            } else if (clone instanceof ParticleSystem) {
                // Notify
                this._editor.selectedParticleSystemObservable.notifyObservers(clone);
            }
        }

        return clone;
    }

    /**
     * Removes the given node.
     * @param node the node to remove.
     */
    public removeObject(node: Node | IParticleSystem | Sound): void {
        const descendants = [node].concat(node instanceof Node ? node.getDescendants() : []);
        const actions = descendants.map((d) => this._removeObject(d));

        undoRedo.push({
            description: `Removed objects from graph: [${descendants.map((d) => d.name).join(", ")}]`,
            common: () => {
                this.refresh();
            },
            redo: () => {
                actions.forEach((a) => a.redo());
            },
            undo: () => {
                actions.forEach((a) => a.undo());
            },
        });
    }

    /**
     * Removes the given node.
     * @param node the node to remove.
     * @hidden
     */
    public _removeObject(node: Node | IParticleSystem | Sound): { redo: () => void; undo: () => void; } {
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
            removeFunc = this._editor.scene!.mainSoundTrack.removeSound;
            addFunc = this._editor.scene!.mainSoundTrack.addSound;
            caller = this._editor.scene!.mainSoundTrack;
        }

        if (!removeFunc || !addFunc) {
            return { redo: () => { }, undo: () => { } };
        }

        const parent = node instanceof Node ? node.parent :
                       node instanceof Sound ? node["_connectedTransformNode"] :
                       node.emitter as AbstractMesh;
        const lods = node instanceof Mesh ? node.getLODLevels().slice() : [];
        const particleSystems = this._editor.scene!.particleSystems.filter((ps) => ps.emitter === node);
        const shadowLights = this._editor.scene!.lights.filter((l) => l.getShadowGenerator()?.getShadowMap()?.renderList)
                                                       .filter((l) => l.getShadowGenerator()!.getShadowMap()!.renderList!.indexOf(node as AbstractMesh) !== -1);

        const sounds: Sound[] = [];
        [this._editor.scene!.mainSoundTrack].concat(this._editor.scene!.soundTracks ?? []).forEach((st) => {
            if (!st) { return; }
            st.soundCollection?.forEach((s) => s["_connectedTransformNode"] === node && sounds.push(s));
        });
        
        return ({
            redo: () => {
                if (node instanceof Node) { node.parent = null; }
                
                removeFunc?.call(caller, node);
                
                if (node instanceof Sound) {
                    if (parent) { node.detachFromMesh(); }
                    this._editor.assets.forceRefresh(SoundAssets);
                }

                if (node instanceof InstancedMesh) { node.sourceMesh.removeInstance(node); }

                if (node instanceof Mesh) {
                    node.doNotSerialize = true;
                    
                    lods.forEach((lod) => {
                        node.removeLODLevel(lod.mesh!);
                        if (lod.mesh) {
                            lod.mesh.doNotSerialize = true;
                            this._editor.scene!.removeMesh(lod.mesh);
                        }
                    });
                }

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

                sounds.forEach((s) => {
                    s.detachFromMesh();
                    s.spatialSound = false;
                });
            },
            undo: () => {
                addFunc?.call(caller, node);

                if (node instanceof Mesh) {
                    node.doNotSerialize = false;

                    lods.forEach((lod) => {
                        if (lod.mesh) {
                            lod.mesh.doNotSerialize = false;
                            this._editor.scene!.addMesh(lod.mesh);
                        }
                        node.addLODLevel(lod.distance, lod.mesh);
                    });
                }
                if (node instanceof InstancedMesh) { node.sourceMesh.addInstance(node); }

                if (node instanceof Node) {
                    node.parent = parent;
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

                sounds.forEach((s) => s.attachToMesh(node as TransformNode));
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

        let disabled = false;

        node.metadata = node.metadata ?? { };
        if (node instanceof AbstractMesh) {
            disabled = (node.metadata?.collider ?? null) !== null;

            node.metadata.isPickable = disabled ? false : node.metadata.isPickable ?? node.isPickable;
            node.isPickable = !disabled;

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
            style.opacity = "0.5";
            style.textDecoration = "line-through";
        }

        if (node.metadata.isLocked) {
            style.opacity = "0.5";
        }

        if (node.metadata.script?.name && node.metadata.script.name !== "None") {
            style.color = "#48aff0";
        }

        if (disabled) {
            style.color = "grey";
        }

        if (node.metadata?.editorGraphStyles) {
            Object.assign(style, node.metadata.editorGraphStyles);
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

        // Mesh and skeleton?
        if (node instanceof AbstractMesh && node.skeleton) {
            children.splice(0, 0, (
                <Tree.TreeNode
                    active
                    expanded
                    title={node.skeleton.name}
                    key={`${node.skeleton.name}-${node.skeleton.id}`}
                    isLeaf
                    icon={<Icon src="human-skull.svg" />}
                />
            ));
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

        // Update references
        let updateReferences: React.ReactNode;
        if (node.metadata?._waitingUpdatedReferences && Object.values(node.metadata?._waitingUpdatedReferences).find((v) => v !== undefined)) {
            updateReferences = (
                <Tag
                    interactive={true}
                    intent={Intent.WARNING}
                    style={{ marginLeft: "10px" }}
                    onClick={(e) => {
                        const mesh = node as Mesh;
                        const meshMedatata = Tools.GetMeshMetadata(mesh);

                        let updateGeometry: React.ReactNode;
                        let updateMaterial: React.ReactNode;

                        if (meshMedatata._waitingUpdatedReferences?.geometry != undefined) {
                            updateGeometry = (<MenuItem text="Update Geometry" onClick={() => {
                                meshMedatata._waitingUpdatedReferences!.geometry!.geometry?.applyToMesh(mesh);
                                mesh.skeleton = meshMedatata._waitingUpdatedReferences!.geometry!.skeleton ?? null;
                                
                                if (meshMedatata._waitingUpdatedReferences!.geometry!.subMeshes) {
                                    mesh.subMeshes = [];
                                    meshMedatata._waitingUpdatedReferences!.geometry!.subMeshes?.forEach((sm) => {
                                        new SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, mesh, mesh, true, true);
                                    });
                                }

                                delete meshMedatata._waitingUpdatedReferences!.geometry;
                                this.refresh();
                            }} />);
                        }

                        if (meshMedatata._waitingUpdatedReferences?.material !== undefined) {
                            updateMaterial = (<MenuItem text="Update Material" onClick={() => {
                                mesh.material = meshMedatata._waitingUpdatedReferences?.material ?? null;
                                delete meshMedatata._waitingUpdatedReferences!.material;
                                this.refresh();
                            }} />);
                        }

                        ContextMenu.show(
                            <Menu className={Classes.DARK}>
                                <Tag>Changes available from source file</Tag>
                                {updateGeometry}
                                {updateMaterial}
                                <MenuDivider />
                                <MenuItem text="Update All" onClick={() => {
                                    if (meshMedatata._waitingUpdatedReferences?.geometry) {
                                        meshMedatata._waitingUpdatedReferences.geometry.geometry?.applyToMesh(mesh);
                                        mesh.skeleton = meshMedatata._waitingUpdatedReferences.geometry.skeleton ?? null;
                                        
                                        if (meshMedatata._waitingUpdatedReferences!.geometry!.subMeshes) {
                                            mesh.subMeshes = [];
                                            meshMedatata._waitingUpdatedReferences!.geometry!.subMeshes?.forEach((sm) => {
                                                new SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, mesh, mesh, true, true);
                                            });
                                        }
                                    }

                                    if (meshMedatata._waitingUpdatedReferences?.material !== undefined) {
                                        mesh.material = meshMedatata._waitingUpdatedReferences?.material ?? null;
                                    }

                                    delete meshMedatata._waitingUpdatedReferences;

                                    this.refresh();
                                }} />
                            </Menu>,
                            { left: e.clientX, top: e.clientY }
                        );
                    }}
                >...</Tag>
            );
        }

        return (
            <Tree.TreeNode
                active={true}
                disabled={disabled}
                expanded={true}
                title={
                    <Tooltip
                        content={<span>{ctor}</span>}
                        usePortal={true}
                    >
                        <>
                            <span style={style}>{name}</span>
                            {updateReferences}
                        </>
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
     * @param e the event object coming from react.
     * @param graphNode the node being right-clicked in the tree.
     */
    private _handleNodeContextMenu(e: React.MouseEvent, graphNode: any): void {
        if (graphNode.disabled) {
            return;
        }

        let node = this._getNodeById(graphNode.key);

        if (!node || node === SceneSettings.Camera) { return; }
        if (node instanceof Node && node.doNotSerialize) { return; }

        const name = node.name ?? Tools.GetConstructorName(node);

        const subMeshesItems: React.ReactNode[] = [];
        if (node instanceof Mesh && node.subMeshes?.length && node.subMeshes.length > 1) {
            const multiMaterial = node.material && node.material instanceof MultiMaterial ? node.material : null;

            subMeshesItems.push(<MenuDivider />);
            subMeshesItems.push(<Code>Sub-Meshes:</Code>);

            node.subMeshes.forEach((sm, index) => {
                const material = multiMaterial && sm.getMaterial();
                const text = material ? (material.name ?? Tools.GetConstructorName(material)) : `Sub Mesh "${index}`;
                const key = `${(node as Mesh)!.id}-${index}`;
                const extraMenu = <MenuItem key={key} text={text} icon={<Icon src="vector-square.svg" />} onClick={() => this._editor.selectedSubMeshObservable.notifyObservers(sm)} />;
                subMeshesItems.push(extraMenu);
            });
        }

        let subMeshesItem = subMeshesItems.length ? (
            <div style={{ maxHeight: "300px", overflow: "auto" }}>
                {subMeshesItems}
            </div>
        ) : undefined;

        let mergeMeshesItem: React.ReactNode;
        let doNotExportItem: React.ReactNode;
        let lockedMeshesItem: React.ReactNode;

        if (this.state.selectedNodeIds) {
            const all = this.state.selectedNodeIds.map((id) => this._getNodeById(id)) as Mesh[];
            const notAllMeshes = all.find((n) => !(n instanceof Mesh));
            const notAllAbstractMeshes = all.find((n) => !(n instanceof AbstractMesh));
            const notAllNodes = all.find((n) => !(n instanceof Node));

            if (!notAllMeshes && all.length > 1) {
                mergeMeshesItem = (
                    <>
                        <MenuDivider />
                        <MenuItem text="Merge Meshes..." onClick={() => SceneTools.MergeMeshes(this._editor, all as Mesh[])} />
                    </>
                );
            }

            if (!notAllNodes) {
                all.forEach((n) => {
                    n.metadata = n.metadata ?? { };
                    n.metadata.doNotExport = n.metadata.doNotExport ?? false;
                });

                doNotExportItem = (
                    <>
                        <MenuDivider />
                        <MenuItem text="Do Not Export" icon={(node as Node).metadata.doNotExport ? <Icon src="check.svg" /> : undefined} onClick={() => {
                            all.forEach((n) => {
                                n.metadata.doNotExport = !n.metadata.doNotExport;
                            });
                            
                            this.refresh();
                        }} />
                    </>
                )
            }

            if (!notAllAbstractMeshes) {
                lockedMeshesItem = (
                    <>
                        <MenuDivider />
                        <MenuItem text="Locked" icon={(node as Mesh).metadata?.isLocked ? <Icon src="check.svg" /> : undefined} onClick={() => {
                            all.forEach((m) => {
                                m.metadata = m.metadata ?? { };
                                m.metadata.isLocked = m.metadata.isLocked ?? false;
                                m.metadata.isLocked = !m.metadata.isLocked;
                            });

                            this.refresh();
                        }} />
                    </>
                );
            }
        }

        // Copy paste
        let copyPasteTransform: React.ReactNode;
        if (node instanceof AbstractMesh || node instanceof Light || node instanceof Camera) {
            const copyTransform = (property: string) => {
                if (this._copiedTransform?.[property]) {
                    const base = node![property]?.clone();
                    const target = this._copiedTransform[property].clone();

                    undoRedo.push({
                        description: `Changed transform information of object "${node?.["name"] ?? "undefiend"}" from "${base.toString()}" to "${target.toString()}"`,
                        common: () => this._editor.inspector.refreshDisplay(),
                        undo: () => node![property] = base,
                        redo: () => node![property] = target,
                    });
                }

                this._editor.inspector.refreshDisplay();
            };

            copyPasteTransform = (
                <>
                    <MenuItem text="Copy Transform" icon="duplicate" onClick={() => this._copiedTransform = node as any} />
                    <MenuItem text="Paste Transform" icon="clipboard" label={`(${this._copiedTransform?.name ?? "None"})`} disabled={this._copiedTransform === null}>
                        <MenuItem text="All" onClick={() => {
                            copyTransform("position");
                            copyTransform("rotationQuaternion");
                            copyTransform("rotation");
                            copyTransform("scaling");
                            copyTransform("direction");
                        }} />
                        <MenuDivider />
                        <MenuItem text="Position" disabled={(this._copiedTransform?.["position"] ?? null) === null} onClick={() => {
                            copyTransform("position");
                        }} />
                        <MenuItem text="Rotation" disabled={((this._copiedTransform?.["rotationQuaternion"] ?? null) || (this._copiedTransform?.["rotation"] ?? null)) === null} onClick={() => {
                            copyTransform("rotationQuaternion");
                            copyTransform("rotation");
                        }} />
                        <MenuItem text="Scaling" disabled={(this._copiedTransform?.["scaling"] ?? null) === null} onClick={() => {
                            copyTransform("scaling");
                        }} />
                        <MenuDivider />
                        <MenuItem text="Direction" disabled={(this._copiedTransform?.["direction"] ?? null) === null} onClick={() => {
                            copyTransform("direction");
                        }} />
                    </MenuItem>
                    <MenuDivider />
                </>
            );
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <Pre>
                    <p style={{ color: "white", marginBottom: "0px" }}>Name</p>
                    <EditableText
                        disabled={node instanceof Sound}
                        value={name}
                        intent={Intent.PRIMARY}
                        multiline={true}
                        confirmOnEnterKey={true}
                        selectAllOnFocus={true}
                        className={Classes.FILL}
                        onConfirm={(v) => {
                            const oldName = node!.name;
                            undoRedo.push({
                                description: `Changed name of node "${node?.name ?? "undefined"}" from "${oldName}" to "${v}"`,
                                common: () => this.refresh(),
                                redo: () => node!.name = v,
                                undo: () => node!.name = oldName,
                            });
                        }}
                    />
                </Pre>
                <MenuDivider />
                <MenuItem text="Clone" disabled={node instanceof Sound} icon={<Icon src="clone.svg" />} onClick={() => this._handleCloneObject()} />
                <MenuDivider />
                <MenuItem text="Focus..." onClick={() => this._editor.preview.focusNode(node!, false)} />
                <MenuDivider />
                {copyPasteTransform}
                <MenuItem text="Prefab">
                    <MenuItem text="Create Prefab..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(this._editor, node as Mesh, false)} />
                    <MenuItem text="Create Prefab As..." disabled={!(node instanceof Mesh)} icon={<Icon src="plus.svg" />} onClick={() => Prefab.CreateMeshPrefab(this._editor, node as Mesh, true)} />
                </MenuItem>
                <MenuItem text="Export">
                    <MenuItem text="Export as Babylon..." disabled={!(node instanceof Mesh)} onClick={() => SceneTools.ExportMeshToBabylonJSFormat(this._editor, node as Mesh)} />
                </MenuItem>
                {mergeMeshesItem}
                {doNotExportItem}
                {lockedMeshesItem}
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveObject()} />
                {subMeshesItem}
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

            this.removeObject(node);
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

        // Scene?
        if (id === "__editor__scene__") {
            this._editor.selectedSceneObservable.notifyObservers(this._editor.scene!);
            return;
        }

        // Skeleton?
        const skeleton = this._scene.skeletons.find((s) => id === `${s.name}-${s.id}`);
        if (skeleton) {
            this._editor.selectedSkeletonObservable.notifyObservers(skeleton);
            return;
        }

        // Node
        let lastSelected = this._getNodeById(id);
        if (!lastSelected) {
            return;
        }

        if (lastSelected instanceof Node) {
            this._editor.selectedNodeObservable.notifyObservers(lastSelected, undefined, this);
        } else if (lastSelected instanceof Sound) {
            this._editor.selectedSoundObservable.notifyObservers(lastSelected, undefined, this);
        } else if (lastSelected instanceof ParticleSystem) {
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
                this.setState({ selectedNodeIds: this.state.selectedNodeIds.concat([draggedNodeId]) });
            }
        } else {
            if (this.state.selectedNodeIds?.indexOf(draggedNodeId) === -1) {
                this.setState({ selectedNodeIds: [draggedNodeId] });
            }
        }

        const event = info.event.nativeEvent as DragEvent;
        if (event) {
            event.dataTransfer?.setData("graph/node", JSON.stringify({
                nodeId: draggedNodeId,
            }));
        }
    }

    /**
     * Called on a node is dropped in the graph.
     */
    private _handleDrop(info: _ITreeDropInfo): void {
        if (!this.state.selectedNodeIds) { return; }
        if (!info.dragNode) { return this._handleDropAsset(info); }

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
     * Called on an asset has been dropped on the node.
     */
    private _handleDropAsset(info: _ITreeDropInfo): void {
        const ev = info.event as unknown as DragEvent;
        if (!ev.dataTransfer) { return; }

        const target = this._getNodeById(info.node.key);
        if (!(target instanceof Node)) { return; }

        let nodes = [target];
        if (this.state.selectedNodeIds && this.state.selectedNodeIds.indexOf(target.id) !== -1) {
            nodes = this.state.selectedNodeIds
                        .map((s) => this._getNodeById(s))
                        .filter((n) => n instanceof Node && nodes.indexOf(n) === -1)
                        .concat(nodes) as Node[];
        }

        const components = this._editor.assets.getAssetsComponents();
        for (const c of components) {
            if (!c._id || !c._ref?.dragAndDropType) { continue; }

            try {
                const data = JSON.parse(ev.dataTransfer.getData(c._ref.dragAndDropType)) as IDragAndDroppedAssetComponentItem;

                if (c._id !== data.assetComponentId) { continue; }
                if (c._ref.onGraphDropAsset(data, nodes)) { break; }
            } catch (e) {
                // Catch silently.
            }
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
