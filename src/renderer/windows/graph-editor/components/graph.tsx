import { readJSON } from "fs-extra";

import { Nullable, Undefinable } from "../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, Classes, Button, MenuDivider } from "@blueprintjs/core";

import { Scene } from "babylonjs";
import { LGraph, LGraphCanvas, LGraphGroup, LiteGraph, LLink } from "litegraph.js";

import { IAssetComponentItem } from "../../../editor/assets/abstract-assets";

import { EditableText } from "../../../editor/gui/editable-text";
import { Alert } from "../../../editor/gui/alert";

import { Tools } from "../../../editor/tools/tools";
import { IPCTools } from "../../../editor/tools/ipc";
import { undoRedo } from "../../../editor/tools/undo-redo";

import { INodeResult, IAssetResult, IMaterialResult } from "../../../editor/scene/utils";

import { GraphCodeGenerator } from "../../../editor/graph/generate";
import { GraphNode, ELinkErrorType } from "../../../editor/graph/node";
import { NodeUtils } from "../../../editor/graph/utils";

import { Mesh } from "../../../editor/graph/mesh/mesh";
import { TransformNode } from "../../../editor/graph/transform-node/transform-node";
import { Camera } from "../../../editor/graph/camera/camera";
import { Light } from "../../../editor/graph/light/light";
import { Sound } from "../../../editor/graph/sound/sound";
import { AnimationGroup } from "../../../editor/graph/animation/animation-group";
import { ParticleSystem } from "../../../editor/graph/particle-system/particle-system";
import { Texture } from "../../../editor/graph/texture/texture";
import { Material } from "../../../editor/graph/material/material";

import { GetMesh } from "../../../editor/graph/mesh/get-mesh";
import { GetCamera } from "../../../editor/graph/camera/get-camera";
import { GetLight } from "../../../editor/graph/light/get-light";

import { GraphContextMenu } from "../context-menu";
import { NodeCreator } from "../node-creator";
import GraphEditorWindow from "../index";

declare module "litegraph.js" {
    interface LGraph {
        onNodeAdded?: (n: GraphNode) => void;

        add(graphOrGroup: GraphNode | LGraphGroup): void;
        remove(graphOrGroup: GraphNode | LGraphGroup): void;

        sendEventToAllNodes(event: string): void;

        hasPaused: boolean;
    }

    interface LGraphCanvas {
        read_only: boolean;
        notifyLinkError(errorType: ELinkErrorType): void;
        onNodeMoved?(node: GraphNode): void;
    }

    interface INodeInputSlot {
        /**
         * Defines the output linked to the input. When a link exists, the output
         * type becomes the input's type.
         */
        linkedOutput?: string;
    }
}

export interface IGraphProps {
    /**
     * Defines the reference to the editor's window main class.
     */
    editor: GraphEditorWindow;
}

export class Graph extends React.Component<IGraphProps> {
    /**
     * Defines the reference to the canvas used to draw the graph.
     */
    public canvas: HTMLCanvasElement;
    /**
     * Defines the reference to the graph that contains nodes.
     */
    public graph: Nullable<LGraph> = null;
    /**
     * Defines the reference to the graph canvas utility that renders the graph.
     */
    public graphCanvas: Nullable<LGraphCanvas> = null;
    /**
     * Defines the path to the JSON file containing the graph.
     */
    public jsonPath: Nullable<string> = null;

    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this.canvas = ref,
    };

    private _editor: GraphEditorWindow;

    private _canvasFocused: boolean = false;
    private _pausedNode: Nullable<GraphNode> = null;

    private _startedGraphInvervals: number[] = [];
    private _startedGraphs: LGraph[] = [];

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IGraphProps) {
        super(props);

        this._editor = props.editor;
        props.editor.graph = this;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <canvas ref={this._refHandler.getCanvas} className="graphcanvas" style={{ width: "100%", height: "100%", position: "absolute", top: "0" }}></canvas>;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._bindEvents();
        this._updateSceneNodesLists();
    }

    /**
     * Called on the window or layout is resized.
     */
    public resize(): void {
        const size = this._editor.getPanelSize("graph");
        if (size.width <= 0 || size.height <= 0) {
            return;
        }

        this.graphCanvas?.resize(size.width, size.height);
        this.graphCanvas?.setDirty(true, true);
    }

    /**
     * Called on the component did mount.
     */
    public async initGraph(jsonPath: string): Promise<void> {
        this.jsonPath = jsonPath;

        // Configure graph
        const json = await readJSON(jsonPath);
        this.graph = new LGraph();
        this.graph.configure(json, false);
        this.graph["scene"] = this._editor.preview.getScene();
        this.graph.config["align_to_grid"] = true;
        this._checkGraph();

        // Graph events
        const connectionChange = this.graph.connectionChange;
        this.graph.connectionChange = (n) => {
            connectionChange.call(this.graph, n);
            this._checkGraph();
        }

        this.graph.onNodeAdded = () => {
            this._checkGraph();
        };

        // Create graph canvas
        this.graphCanvas = new LGraphCanvas(this.canvas, this.graph, {
            autoresize: true,
            skip_render: false,
        });
        this.graphCanvas.canvas.addEventListener("mousemove", () => {
            this.graphCanvas!.dirty_bgcanvas = true;
            this.graphCanvas!.dirty_canvas = true;
        });

        // Preferences
        const preferences = JSON.parse(localStorage.getItem("babylonjs-editor-graph-preferences") ?? "{ }");

        this.graphCanvas.render_canvas_border = false;
        this.graphCanvas.highquality_render = true;
        this.graphCanvas.render_execution_order = preferences.render_execution_order ?? true;
        this.graphCanvas.render_curved_connections = preferences.render_curved_connections ?? true;
        this.graphCanvas.show_info = preferences.show_info ?? true;

        // Override
        this.graphCanvas.showSearchBox = (e: MouseEvent) => {
            setTimeout(() => this.addNode(e), 100);
        };

        this.graphCanvas.notifyLinkError = (errorType: ELinkErrorType) => {
            switch (errorType) {
                case ELinkErrorType.MultipleEvent: Alert.Show("Can't connect nodes", "Triggerable links can't be parallelized, they must be linear by chaining actions."); break;
                default: break;
            }
        };

        this.graphCanvas.canvas.addEventListener("mouseover", () => this._canvasFocused = true);
        this.graphCanvas.canvas.addEventListener("mouseout", () => this._canvasFocused = false);

        this.graphCanvas.canvas.addEventListener("click", (e) => {
            const pos = this.graphCanvas!.convertEventToCanvasOffset(e);

            const node = this.graph?.getNodeOnPos(pos[0], pos[1]) as Undefinable<GraphNode>;
            if (node) { return this._editor.inspector.setNode(node); }

            const group = this.graph?.getGroupOnPos(pos[0], pos[1]) as Undefinable<LGraphGroup>;
            if (group) { return this._editor.inspector.setGroup(group); }
        });

        this.graphCanvas.canvas.addEventListener("dblclick", (e) => {
            const pos = this.graphCanvas!.convertEventToCanvasOffset(e);

            const node = this.graph?.getNodeOnPos(pos[0], pos[1]) as Undefinable<GraphNode>;
            if (node && node instanceof GraphNode) {
                node.focusOn();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (!this._canvasFocused) { return; }
            
            // Copy/paste
            if (event.key === "c" && event.ctrlKey) {
                return this.graphCanvas?.copyToClipboard();
            }
            
            if (event.key === "v" && event.ctrlKey) {
                return this.graphCanvas?.pasteFromClipboard();
            }

            // Del
            if (event.keyCode === 46) {
                return this.removeNode();
            }
        });

        this.graphCanvas.processContextMenu = (n, e: MouseEvent) => {
            if (n) {
                return GraphContextMenu.ShowNodeContextMenu(e, this);
            }

            const pos = this.graphCanvas!.convertEventToCanvasOffset(e);
            const group = this.graph?.getGroupOnPos(pos[0], pos[1]);
            GraphContextMenu.ShowGraphContextMenu(e, this, group!);
        };

        this.graphCanvas.showLinkMenu = (l, e) => {
            GraphContextMenu.ShowLinkContextMenu(l, e, this);
            return false;
        };

        this.graphCanvas.prompt = (title, value, callback, event: MouseEvent) => {
            ContextMenu.show(
                <Menu className={Classes.DARK}>
                    <Button disabled={true}>{title}</Button>
                    <MenuDivider />
                    <EditableText
                        disabled={false}
                        value={value.toString()}
                        multiline={true}
                        confirmOnEnterKey={true}
                        selectAllOnFocus={true}
                        className={Classes.FILL}
                        onConfirm={(v) => {
                            const ctor = Tools.GetConstructorName(v).toLowerCase();
                            switch (ctor) {
                                case "string": callback(v); break;
                                case "number": callback(parseFloat(v)); break;
                            }

                            if (ContextMenu.isOpen()) {
                                ContextMenu.hide();
                            }
                        }}
                    />
                </Menu>,
                { left: event.clientX, top: event.clientY }
            );

            return document.createElement("div");
        };

        this.graphCanvas.onNodeMoved = (n) => {
            const lastPosition = [n._lastPosition[0], n._lastPosition[1]];
            const newPosition = [n.pos[0], n.pos[1]];

            undoRedo.push({
                common: () => this.graphCanvas?.setDirty(true, true),
                undo: () => {
                    n.pos[0] = lastPosition[0];
                    n.pos[1] = lastPosition[1];
                },
                redo: () => {
                    n.pos[0] = newPosition[0];
                    n.pos[1] = newPosition[1];
                },
            });
        }

        this.resize();

        // Select first node
        const firstNode = this.getAllNodes()[0];
        if (firstNode) {
            this.graphCanvas.selectNode(firstNode);
            this._editor.inspector.setNode(firstNode);
        }
    }

    /**
     * Clones all the selected nodes.
     */
    public cloneNode(): void {
        this.graphCanvas?.copyToClipboard();
        this.graphCanvas?.pasteFromClipboard();
    }

    /**
     * Removes all the selected nodes.
     */
    public removeNode(): void {
        // node.graph?.remove(node);
        if (!this.graphCanvas) { return; }

        const nodes: { node: GraphNode; inputs: LLink[]; outputs: LLink[][]; }[] = [];
        for (const nodeId in this.graphCanvas.selected_nodes) {
            const node = this.graphCanvas.selected_nodes[nodeId] as GraphNode;
            nodes.push({
                node,
                outputs: node.outputs.filter((o) => o.links).map((o) => o.links!.map((l) => this.graph!.links[l])),
                inputs: node.inputs.filter((o) => o.link).map((o) => this.graph!.links[o.link!]),
            });
        }

        undoRedo.push({
            common: () => this.graphCanvas?.setDirty(true, true),
            undo: () => {
                nodes.forEach((n) => {
                    this.graph?.add(n.node);
                    n.inputs.forEach((i) => {
                        const originNode = this.graph?.getNodeById(i.origin_id);
                        originNode?.connect(i.origin_slot, n.node, i.target_slot);
                    });

                    n.outputs.forEach((o) => {
                        o.forEach((o2) => {
                            const targetNode = this.graph?.getNodeById(o2.target_id);
                            if (targetNode) {
                                n.node.connect(o2.origin_slot, targetNode, o2.target_slot);
                            }
                        });
                    });
                });
            },
            redo: () => {
                nodes.forEach((n) => this.graph?.remove(n.node));
            },
        });
    }

    /**
     * Adds a new node to the graph.
     * @param event defines the right-click event.
     */
    public async addNode(event: MouseEvent): Promise<void> {
        const type = await NodeCreator.Show();
        if (!type) {
            return;
        }

        const node = LiteGraph.createNode(type) as GraphNode;
        node.pos = node._lastPosition = this.graphCanvas!.convertEventToCanvasOffset(event);

        undoRedo.push({
            common: () => this.graphCanvas?.setDirty(true, true),
            undo: () => this.graph?.remove(node),
            redo: () => this.graph?.add(node, false),
        });
    }

    /**
     * Removes the given group.
     * @param group defines the reference to the group to remove.
     */
    public removeGroup(group: LGraphGroup): void {
        undoRedo.push({
            common: () => this.graphCanvas?.setDirty(true, true),
            undo: () => this.graph?.add(group),
            redo: () => this.graph?.remove(group),
        });
    }

    /**
     * Adds a new group.
     * @param event defines the right-click event.
     */
    public addGroup(event: MouseEvent): void {
        const group = new LGraphGroup();
        const pos = this.graphCanvas!.convertEventToCanvasOffset(event);

        group.move(pos[0], pos[1], true);

        undoRedo.push({
            common: () => this.graphCanvas?.setDirty(true, true),
            undo: () => this.graph?.remove(group),
            redo: () => this.graph?.add(group),
        });
    }

    /**
     * Removes the given link from the graph.
     * @param link defines the reference to the link to remove.
     */
    public removeLink(link: LLink): void {
        const originNode = this.graph?.getNodeById(link.origin_id);
        const targetNode = this.graph?.getNodeById(link.target_id);

        if (!originNode || !targetNode) { return; }

        undoRedo.push({
            common: () => this.graphCanvas?.setDirty(true, true),
            undo: () => originNode.connect(link.origin_slot, targetNode, link.target_slot),
            redo: () => this.graph?.removeLink(link.id),
        });
    }

    /**
     * Called on the graph is being started.
     * @param standalone defines wehter or not only the current graph will be executed.
     */
    public async start(scene: Scene, standalone: boolean): Promise<void> {
        if (!this.graph || !this.graphCanvas) { return; }

        // Start other graphs?
        if (!standalone) {
            const graphs = await IPCTools.ExecuteEditorFunction<IAssetComponentItem[]>("assets.getAssetsOfComponentId", "graphs");

            for (const g of graphs.data) {
                const path = g.key;
                if (path === this._editor.graph.jsonPath) { continue; }

                const graphContent = await readJSON(path);
                const graph = new LGraph();
                graph.configure(graphContent, false);

                this.startGraph(graph, scene);
            }
        }

        this.startGraph(this.graph, scene);
    }

    /**
     * Starts the given graph with the given scene.
     * @todo
     * @param graph defines the reference to the graph to start.
     * @param scene defines the reference to the scene attached to graph.
     */
    public startGraph(graph: LGraph, scene: Scene): void {
        graph.hasPaused = false;
        graph["scene"] = scene;

        graph.status = LGraph.STATUS_RUNNING;
        this.getAllNodes(graph).forEach((n) => n.onStart());

        const intervalId = setInterval(() => {
            if (NodeUtils.PausedNode !== this._pausedNode) {
                this._pausedNode = NodeUtils.PausedNode;
                this._editor.callStack.refresh();
            }

            if (!graph.hasPaused) { graph.runStep(); }
        }, 0) as any;

        this._startedGraphInvervals.push(intervalId);
        this._startedGraphs.push(graph);
    }

    /**
     * Stops the graph.
     */
    public stop(): void {
        this._startedGraphInvervals.forEach((i) => {
            clearInterval(i);
        });
        this._startedGraphInvervals = [];

        this._startedGraphs.forEach((graph) => {
            graph.status = LGraph.STATUS_STOPPED;
            this.getAllNodes(graph).forEach((n) => n.onStop());
            graph.hasPaused = false;
        });
        this._startedGraphs = [];
    }

    /**
     * Refreshes the graph.
     */
    public refresh(): void {
        this.graphCanvas?.setDirty(true, true);
    }

    /**
     * Returns the list of all available nodes of the graph.
     */
    public getAllNodes(graph?: LGraph): GraphNode[] {
        return (graph ?? this.graph!)["_nodes"] as GraphNode[];
    }

    /**
     * Checks the graph.
     */
    private _checkGraph(): void {
        const check = GraphCodeGenerator._GenerateCode(this.graph!);
        if (check.error) {
            check.error.node.color = "#ff2222";
        } else {
            this.getAllNodes().forEach((n) => NodeUtils.SetColor(n));
        }
    }

    /**
     * Binds all the window events.
     */
    private _bindEvents(): void {
        window.addEventListener("focus", () => this._updateSceneNodesLists());
    }

    /**
     * Updates the list of nodes in the scene.
     */
    private async _updateSceneNodesLists(): Promise<void> {
        const meshes = await IPCTools.ExecuteEditorFunction<INodeResult[]>("sceneUtils.getAllMeshes");
        Mesh.Meshes = GetMesh.Meshes = meshes.data.map((d) => d.name);
        
        const cameras = await IPCTools.ExecuteEditorFunction<INodeResult[]>("sceneUtils.getAllCameras");
        Camera.Cameras = GetCamera.Cameras = cameras.data.map((d) => d.name);

        const sounds = await IPCTools.ExecuteEditorFunction<string[]>("sceneUtils.getAllSounds");
        Sound.Sounds = sounds.data;

        const lights = await IPCTools.ExecuteEditorFunction<INodeResult[]>("sceneUtils.getAllLights");
        Light.Lights = GetLight.Lights = lights.data.map((l) => l.name);

        const transformNodes = await IPCTools.ExecuteEditorFunction<INodeResult[]>("sceneUtils.getAllTransformNodes");
        TransformNode.TransformNodes = transformNodes.data.map((l) => l.name);

        const animationGroups = await IPCTools.ExecuteEditorFunction<string[]>("sceneUtils.getAllAnimationGroups");
        AnimationGroup.Groups = animationGroups.data;

        const particleSystems = await IPCTools.ExecuteEditorFunction<INodeResult[]>("sceneUtils.getAllParticleSystems");
        ParticleSystem.ParticleSystems = particleSystems.data.map((ps) => ps.name);

        const textures = await IPCTools.ExecuteEditorFunction<IAssetResult[]>("sceneUtils.getAllTextures");
        Texture.Textures = textures.data.map((t) => ({ name: t.name, base64: t.base64 }));

        const materials = await IPCTools.ExecuteEditorFunction<IMaterialResult[]>("sceneUtils.getAllMaterials");
        Material.Materials = materials.data.map((m) => ({ name: m.name, base64: m.base64, type: m.type }));
    }
}
