import * as React from "react";
import Tree from "antd/lib/tree/Tree";
import { DataNode } from "rc-tree/lib/interface";

import {
    Classes, Tooltip, Position, InputGroup, FormGroup, Icon as BPIcon, Switch, ButtonGroup, Button, Popover, Intent, Tag,
} from "@blueprintjs/core";

import { Nullable, Undefinable } from "../../../shared/types";

import {
    Node, Scene, Mesh, Light, Camera, TransformNode, InstancedMesh, AbstractMesh,
    IParticleSystem, ParticleSystem, Sound, Bone, ReflectionProbe,
} from "babylonjs";

import { Editor } from "../editor";

import { Icon } from "../gui/icon";
import { InspectorNotifier } from "../gui/inspector/notifier";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";
import { IMeshMetadata } from "../tools/types";

import { SceneSettings } from "../scene/settings";

import { IDragAndDroppedAssetComponentItem } from "../assets/abstract-assets";

import { GraphContextMenu } from "./graph/context-menu";
import { GraphReferenceUpdater } from "./graph/reference-updater";
import { NodeIcon } from "../gui/node-icon";

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
    nodes: DataNode[];
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
     * Defines the panel's width.
     */
    width?: number;

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

export interface _IDragAndDroppedItem {
    nodeId: string;
    onDropInInspector: (ev: React.DragEvent<HTMLElement>, object: any, property: string) => Promise<void>;
}

export class Graph extends React.Component<IGraphProps, IGraphState> {
    private _editor: Editor;
    private _filter: string = "";

    private _dragging: boolean = false;
    private _firstUpdate: boolean = true;

    private _allKeys: string[] = [];

    /**
     * Defines the last selected node in the graph.
     */
    public lastSelectedObject: Nullable<Node | IParticleSystem | Sound | ReflectionProbe> = null;

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
    public render(): React.ReactNode {
        if (!this.state.nodes.length) { return null; }

        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <InputGroup
                    type="search"
                    placeholder="Search..."
                    className={Classes.FILL}
                    style={{ marginTop: "5px", marginBottom: "5px" }}
                    leftIcon={<BPIcon icon="search" style={{ margin: "12px" }} />}
                    onChange={(e) => this._handleFilterChanged(e.target.value)}
                ></InputGroup>
                <Popover
                    fill
                    lazy
                    usePortal
                    inheritDarkTheme
                    position={Position.BOTTOM}
                    isOpen={this.state.showOptions}
                    popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                    onClose={() => this.setState({ showOptions: false })}
                    content={
                        <FormGroup label="Graph" labelInfo="Options" >
                            <Switch label="Show Instances" checked={this.state.showInstances} onChange={(e) => this.setState({ showInstances: e.currentTarget.checked }, () => this.refresh())} />
                            <Switch label="Show Lights" checked={this.state.showLights} onChange={(e) => this.setState({ showLights: e.currentTarget.checked }, () => this.refresh())} />
                        </FormGroup>
                    }
                >
                    <ButtonGroup fill style={{ backgroundColor: "#333333" }}>
                        <Button
                            text="Options..."
                            onClick={() => this.setState({ showOptions: true })}
                            style={{ marginTop: "5px", marginBottom: "5px", paddingLeft: "5px", paddingRight: "5px" }}
                        />
                    </ButtonGroup>
                </Popover>
                <div style={{ width: "100%", height: "calc(100% - 75px)", overflow: "auto" }}>
                    <Tree.DirectoryTree
                        multiple
                        showIcon
                        blockNode
                        key="Graph"
                        icon={false}
                        checkable={false}
                        autoExpandParent={false}
                        expandAction="doubleClick"
                        className="draggable-tree"
                        treeData={this.state.nodes}
                        style={{ height: "calc(100% - 32px)" }}
                        selectedKeys={this.state.selectedNodeIds ?? []}
                        draggable={{ icon: false, nodeDraggable: () => true }}
                        expandedKeys={this._filter ? this._allKeys : (this.state.expandedNodeIds ?? [])}
                        onDrop={(i) => this._handleDrop(i)}
                        onDragEnd={() => this._handleDragEnd()}
                        onDragEnter={(n) => this._handleDragEnter(n)}
                        onDragStart={(n) => this._handleDragStart(n)}
                        onExpand={(k) => this._handleExpandedNode(k as string[])}
                        onSelect={(k) => this._handleSelectedNodes(k as string[])}
                        onRightClick={(e) => this._handleNodeContextMenu(e.event, e.node)}
                    />
                </div>
            </div>
        );
    }

    /**
     * Resizes the panel
     */
    public resize(): void {
        const panel = this._editor.getPanelSize("graph");
        if (panel.width) {
            this.setState({ width: panel.width });
        }
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
    public setSelected(node: Node | IParticleSystem | Sound | ReflectionProbe, appendToSelected?: boolean): void {
        let expanded = this.state.expandedNodeIds?.slice();
        if (expanded) {
            let parent: Nullable<Node>;
            if (node instanceof Node) {
                parent = node.parent;
            } else if (node instanceof Sound) {
                parent = node["_connectedTransformNode"];
            } else if (node instanceof ReflectionProbe) {
                parent = node["_attachedMesh"];
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

        const id = node instanceof Sound
            ? node.metadata?.id
            : node instanceof ReflectionProbe
                ? node["metadata"]?.id
                : node.id;

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
    public getAllSelected(): (Node | IParticleSystem | Sound | ReflectionProbe)[] {
        const result: (Node | IParticleSystem | Sound | ReflectionProbe)[] = [];
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

            if (clonedMesh.parent) {
                clonedMesh.physicsImpostor?.forceUpdate();
            }

            clonedMesh.physicsImpostor?.sleep();

            clone = clonedMesh;
        }
        else if (node instanceof Light) { clone = node.clone(node.name); }
        else if (node instanceof Camera) { clone = node.clone(node.name); }
        else if (node instanceof TransformNode) { clone = node.clone(node.name, node.parent, false); }
        // else if (node instanceof ParticleSystem) { clone = node.clone(node.name, node.emitter); }

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
            }/* else if (clone instanceof ParticleSystem) {
                // Notify
                this._editor.selectedParticleSystemObservable.notifyObservers(clone);
            }*/
        }

        return clone;
    }

    /**
     * Removes the given node.
     * @param node the node to remove.
     */
    public removeObject(node: Node | IParticleSystem | Sound | ReflectionProbe): void {
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
    public _removeObject(node: Node | IParticleSystem | Sound | ReflectionProbe): { redo: () => void; undo: () => void; } {
        let removeFunc: Nullable<(n: Node | IParticleSystem | Sound | ReflectionProbe) => void> = null;
        let addFunc: Nullable<(n: Node | IParticleSystem | Sound | ReflectionProbe) => void> = null;
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
        } else if (node instanceof ReflectionProbe) {
            removeFunc = this._editor.scene!.removeReflectionProbe;
            addFunc = this._editor.scene!.addReflectionProbe;
        }

        if (!removeFunc || !addFunc) {
            return { redo: () => { }, undo: () => { } };
        }

        const parent =
            node instanceof Node
                ? node.parent
                : node instanceof Sound
                    ? node["_connectedTransformNode"]
                    : node instanceof ReflectionProbe
                        ? node["_attachedMesh"]
                        : node.emitter as AbstractMesh;

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

                if (node instanceof Sound && parent) {
                    node.detachFromMesh();
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
                } else if (node instanceof ReflectionProbe) {
                    // TODO: notify
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
                        node.addLODLevel(lod.distanceOrScreenCoverage, lod.mesh);
                    });
                }
                if (node instanceof InstancedMesh) { node.sourceMesh.addInstance(node); }

                if (node instanceof Node) {
                    node.parent = parent;
                }
                if (node instanceof Sound && parent) {
                    node.attachToMesh(parent);
                }

                particleSystems.forEach((ps) => this._editor.scene!.addParticleSystem(ps));

                if (node instanceof Node) {
                    this._editor.addedNodeObservable.notifyObservers(node);
                } else if (node instanceof Sound) {
                    this._editor.addedSoundObservable.notifyObservers(node);
                } else if (node instanceof ReflectionProbe) {
                    // TODO: notify
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
    private _parseScene(): DataNode[] {
        this._allKeys = [];

        const nodes = this._scene.rootNodes
            .map((n) => this._parseNode(n))
            .filter((n) => n !== null);

        const scene: DataNode = {
            isLeaf: true,
            key: "__editor__scene__",
            title: <span>Scene</span>,
            icon: <Icon src="camera-retro.svg" />,
        };

        // Sounds
        const soundsChildren = this._editor.scene!.mainSoundTrack.soundCollection.filter((s) => !s.spatialSound).map((s) => {
            s.metadata ??= {};
            s.metadata.id ??= Tools.RandomId();

            return {
                isLeaf: true,
                key: s.metadata.id,
                title: <span>{s.name}</span>,
                icon: <Icon src={s.isPlaying ? "volume-up.svg" : "volume-mute.svg"} />,
            } as DataNode;
        });

        const sounds: DataNode = {
            key: "sounds",
            children: soundsChildren,
            title: <span>Sounds</span>,
            isLeaf: soundsChildren.length === 0,
            icon: <Icon src="volume-off.svg" />,
        };

        // Reflection probes
        const reflectionProbesChildren = (this._editor.scene!.reflectionProbes ?? []).filter((rp) => !rp["_attachedMesh"]).map((rp) => {
            rp["metadata"] ??= {};
            rp["metadata"].id ??= Tools.RandomId();

            return {
                isLeaf: true,
                title: rp.name,
                key: rp["metadata"].id,
                icon: <Icon src="reflection-probe.svg" />,
            } as DataNode;
        });

        const reflectionProbes: DataNode = {
            key: "reflectionProbes",
            icon: <Icon src="reflection-probe.svg" />,
            children: reflectionProbesChildren,
            title: <span>Reflection Probes</span>,
            isLeaf: reflectionProbesChildren.length === 0,
        };

        this._allKeys.push(sounds.key as string);
        this._allKeys.push(reflectionProbes.key as string);

        return [scene, sounds, reflectionProbes].concat(nodes as DataNode[]);
    }

    /**
     * Returns the list of all descendants of the given bone.
     */
    private _getBoneDescendants(bone: Bone): { name: string; }[] {
        const all: Node[] = [];
        const skeleton = bone.getSkeleton();

        skeleton.bones.forEach((b) => {
            let parent = b;
            while (parent) {
                if (parent === bone) {
                    all.push(b);
                }
                parent = parent.getParent()!;
            }
        });

        return all;
    }

    /**
     * Parses the given node and returns the new treenode object.
     * @param node the node to parse.
     */
    private _parseNode(node: Node): Nullable<DataNode> {
        if (node instanceof Mesh && node._masterMesh) { return null; }
        if (node === SceneSettings.Camera) { return null; }

        let disabled = false;

        node.metadata = node.metadata ?? {};
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

        let children: DataNode[] = [];

        if (node instanceof AbstractMesh && node.skeleton) {
            // Mesh and skeleton?
            const bones = node.skeleton.bones.filter((b) => !b.getParent());
            const skeletonChildren = bones.map((b) => this._parseNode(b)).filter((sc) => sc !== null) as DataNode[];

            const key = `${node.skeleton.name}-${node.skeleton.id}`;
            this._allKeys.push(key);

            children.splice(0, 0, {
                key,
                title: node.skeleton.name,
                children: skeletonChildren,
                isLeaf: !skeletonChildren.length,
                icon: <Icon src="human-skull.svg" />,
            });
        } else if (node instanceof Bone) {
            // Bone
            const attachedMeshes = this._editor.scene!.meshes.filter((m) => m.parent === node);
            const attachedTransformNodes = this._editor.scene!.transformNodes.filter((tn) => tn.parent === node);

            const attachedNodes = attachedTransformNodes.concat(attachedMeshes);
            const attachedNodesChildren = attachedNodes.map((atn) => this._parseNode(atn)).filter((atn) => atn !== null) as DataNode[];

            children.splice.apply(children, [0, 0, ...attachedNodesChildren]);
        }

        // Filter
        let matchesFilter: boolean = true;
        if (this._filter) {
            let all: { name: string; }[] = [];
            if (node instanceof Bone) {
                all = this._getBoneDescendants(node);
            } else if (node instanceof AbstractMesh && node.skeleton) {
                all = [
                    node,
                    node.skeleton,
                    ...node.getDescendants(),
                    ...node.skeleton.bones,
                ]
            } else {
                all = [node].concat(node.getDescendants());
            }
            matchesFilter = all.find((c) => (c.name ?? Tools.GetConstructorName(c)).toLowerCase().indexOf(this._filter.toLowerCase()) !== -1) !== undefined;
        }

        if (matchesFilter) {
            children.push.apply(children, node.getChildren().map((c: Node) => this._parseNode(c)).filter((n) => n !== null) as DataNode[]);
        } else {
            return null;
        }

        // Search for particle systems.
        this._editor.scene!.particleSystems.forEach((ps) => {
            if (ps.emitter !== node) { return; }

            this._allKeys.push(ps.id);

            children.push({
                key: ps.id,
                isLeaf: true,
                icon: <Icon src="wind.svg" />,
                title: (
                    <Tooltip
                        content={<span>{Tools.GetConstructorName(ps)}</span>}
                        position={Position.RIGHT}
                        usePortal={false}
                    >
                        <span style={style}>{ps.name}</span>
                    </Tooltip>
                ),
            });
        });

        // Search for sounds
        this._editor.scene!.mainSoundTrack.soundCollection.forEach((s) => {
            if (s["_connectedTransformNode"] !== node) { return; }

            s.metadata ??= {};
            s.metadata.id ??= Tools.RandomId();

            this._allKeys.push(s.metadata.id);

            children.push({
                isLeaf: true,
                key: s.metadata.id,
                icon: <Icon src={s.isPlaying ? "volume-up.svg" : "volume-mute.svg"} />,
                title: (
                    <Tooltip
                        content={<span>{Tools.GetConstructorName(s)}</span>}
                        position={Position.RIGHT}
                        usePortal={false}
                    >
                        <span style={style}>{s.name}</span>
                    </Tooltip>
                ),
            });
        });

        // Search for reflection probes
        this._editor.scene!.reflectionProbes?.forEach((rp) => {
            if (rp["_attachedMesh"] !== node) { return; }

            rp["metadata"] ??= {};
            rp["metadata"].id ??= Tools.RandomId();

            children.push({
                isLeaf: true,
                key: rp["metadata"].id,
                icon: <Icon src="reflection-probe.svg" />,
                title: (
                    <Tooltip
                        content={<span>{Tools.GetConstructorName(rp)}</span>}
                        position={Position.RIGHT}
                        usePortal={false}
                    >
                        <span style={style}>{rp.name}</span>
                    </Tooltip>
                ),
            });
        });

        // Update references
        let updateReferences: React.ReactNode;
        if (node.metadata?._waitingUpdatedReferences && Object.values(node.metadata?._waitingUpdatedReferences).find((v) => v !== undefined)) {
            updateReferences = (
                <Tag
                    interactive={true}
                    intent={Intent.WARNING}
                    style={{ marginLeft: "10px" }}
                    onClick={(e) => new GraphReferenceUpdater(node as Mesh).showContextMenu(e)}
                >...</Tag>
            );
        }

        this._allKeys.push(node.id);

        return {
            disabled,
            children,
            key: node.id,
            isLeaf: !children.length,
            icon: (
                <NodeIcon
                    node={node}
                    style={{ opacity: node.isEnabled(true) ? "1.0" : "0.5" }}
                    onClick={() => {
                        node.setEnabled(!node.isEnabled());
                        this.refresh();
                    }}
                />
            ),
            title: (
                <div
                    onDrop={(ev) => !this._dragging && this._handleExternalDrop(ev, node.id)}
                    onDragLeave={(ev) => ev.currentTarget.style.background = "unset"}
                    onDragOver={(ev) => !this._dragging && (ev.currentTarget.style.background = "#333333")}
                    style={{ width: this.state.width ? `${this.state.width}px` : "auto" }}
                >
                    <Tooltip usePortal content={<span>{ctor}</span>}>
                        <>
                            <span style={style}>{name}</span>
                            {updateReferences}
                        </>
                    </Tooltip>
                </div>
            ),
        }
    }

  

    /**
     * Called on the user right-clicks on a node.
     * @param ev the event object coming from react.
     * @param graphNode the node being right-clicked in the tree.
     */
    private _handleNodeContextMenu(ev: React.MouseEvent, graphNode: any): void {
        if (graphNode.disabled) {
            return;
        }

        let node = this._getNodeById(graphNode.key);

        if (!node || node === SceneSettings.Camera) { return; }
        if (node instanceof Node && node.doNotSerialize) { return; }

        GraphContextMenu.Show(ev.nativeEvent, this._editor, node);

        const selectedNodeIds = this.state.selectedNodeIds?.slice() ?? [];
        if (selectedNodeIds.indexOf(graphNode.key) !== -1) { return; }

        if (ev.ctrlKey) {
            selectedNodeIds.push(graphNode.key);
            this.setState({ selectedNodeIds });
        } else {
            this.setState({ selectedNodeIds: [graphNode.key] });
        }
    }

    /**
     * Removes the given node from the graph and destroys its data.
     * @hidden
     */
    public _handleRemoveObject(): void {
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
     * @hidden
     */
    public _handleCloneObject(): void {
        if (!this.state.selectedNodeIds) { return; }
        this.state.selectedNodeIds.forEach((id) => {
            const node = this._getNodeById(id);
            if (!node || node instanceof Sound || node instanceof ReflectionProbe) { return; }

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
        } else if (lastSelected instanceof ReflectionProbe) {
            this._editor.selectedReflectionProbeObservable.notifyObservers(lastSelected, undefined, this);
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

        info.event.dataTransfer.setDragImage(new Image(), 0, 0);

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
                allNodeIds: this.state.selectedNodeIds,
            }));

            InspectorNotifier._DragAndDroppedGraphItem = this._getDragAndDroppedItemConfiguration(draggedNodeId);
        }

        this._dragging = true;
    }

    /**
     * Called on the user ended dragging a node.
     */
    private _handleDragEnd(): void {
        this._dragging = false;
    }

    /**
     * Returns the drag'n'dropped item configuration to be used when the user
     * drags and drops a graph item in an inspector field.
     */
    private _getDragAndDroppedItemConfiguration(nodeId): _IDragAndDroppedItem {
        return {
            nodeId,
            onDropInInspector: async (_, object, property) => {
                object[property] = nodeId;
            },
        };
    }

    /**
     * Called on a node is dropped in the graph.
     */
    private _handleDrop(info: _ITreeDropInfo): void {
        if (!this.state.selectedNodeIds) { return; }
        if (!info.dragNode) { return this._handleDropAsset(info); }

        const source = this._getNodeById(info.dragNode.key);
        if (!source) { return; }

        const all = this.state.selectedNodeIds.map((s) => this._getNodeById(s)).filter((n) => n) as (Node | IParticleSystem | Sound | ReflectionProbe)[];

        // Sound?
        if (info.node.key === "sounds" && info.node.dragOver) {
            all.filter((a) => a instanceof Sound).forEach((s: Sound) => {
                s.detachFromMesh();
                s.spatialSound = false;
            });

            return this.refresh();
        }

        // Reflection probes?
        if (info.node.key === "reflectionProbes" && info.node.dragOver) {
            all.filter((a) => a instanceof ReflectionProbe).forEach((rp: ReflectionProbe) => {
                rp.attachToMesh(null);
            });

            return this.refresh();
        }

        const target = this._getNodeById(info.node.key);
        if (!target || !(target instanceof Node)) { return; }

        if (info.node.dragOver) {
            all.forEach((n) => {
                if (n instanceof Node) {
                    if (target instanceof Bone && n instanceof TransformNode) {
                        const skeleton = target.getSkeleton();
                        const mesh = this._editor.scene!.meshes.find((m) => m.skeleton === skeleton);

                        if (mesh) {
                            n.attachToBone(target, mesh);
                        }

                        return (n.parent = target);
                    } else {
                        return (n.parent = target);
                    }
                }

                if (target instanceof AbstractMesh) {
                    if (n instanceof ParticleSystem) {
                        n.emitter = target;
                    } else if (n instanceof Sound) {
                        n.attachToMesh(target);
                        n.spatialSound = true;
                    } else if (n instanceof ReflectionProbe) {
                        n.attachToMesh(target);
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
                    } else if (n instanceof ReflectionProbe) {
                        n.attachToMesh(target.parent);
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
     * Called on an HTML element has been dropped on the data node.
     */
    private _handleExternalDrop(ev: React.DragEvent<HTMLDivElement>, nodeId: string): void | Promise<void> {
        if (this._dragging) {
            return;
        }

        ev.preventDefault();
        ev.stopPropagation();

        ev.currentTarget.style.background = "unset";

        if (!this.state.selectedNodeIds) {
            return;
        }

        const targetNode = this._getNodeById(nodeId);
        if (!targetNode) {
            return;
        }

        let allSelected = this.state.selectedNodeIds?.map((s) => this._getNodeById(s)).filter((n) => n) as (Node | IParticleSystem | Sound | ReflectionProbe)[];

        if (allSelected.indexOf(targetNode) === -1) {
            allSelected = [targetNode];
            this.setSelected(targetNode);
        }

        if (InspectorNotifier._DragAndDroppedAssetItem) {
            return InspectorNotifier._DragAndDroppedAssetItem.onDropInGraph(ev, allSelected);
        }
    }

    /**
     * Returns the node in the stage identified by the given id.
     * @param id the id of the node to find.
     * @hidden
     */
    public _getNodeById(id: string): Undefinable<Node | IParticleSystem | Sound | ReflectionProbe> {
        const all = Tools.getAllSceneNodes(this._editor.scene!);

        const node = all.find((c) => c.id === id);
        if (node) { return node; }

        const bone = this._editor.scene!.getBoneById(id);
        if (bone) { return bone; }

        const ps = this._editor.scene!.getParticleSystemById(id);
        if (ps) { return ps; }

        const sound = this._editor.scene!.mainSoundTrack.soundCollection.find((s) => s.metadata?.id === id);
        if (sound) { return sound; }

        const rp = this._editor.scene!.reflectionProbes?.find((rp) => rp["metadata"]?.id === id);
        if (rp) { return rp; }

        return undefined;
    }
}
