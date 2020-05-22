import { readJSON } from "fs-extra";

import { Nullable, Undefinable } from "../../../../shared/types";

import * as React from "react";
import { ContextMenu, Menu, Classes, Button, MenuDivider } from "@blueprintjs/core";

import { Scene } from "babylonjs";
import { LGraph, LGraphCanvas, LGraphGroup, LiteGraph, LLink } from "litegraph.js";

import { EditableText } from "../../../editor/gui/editable-text";

import { Tools } from "../../../editor/tools/tools";
import { IPCTools } from "../../../editor/tools/ipc";

import { INodeResult } from "../../../editor/scene/utils";

import { GraphCodeGenerator } from "../../../editor/graph/generate";
import { GraphNode } from "../../../editor/graph/node";
import { NodeUtils } from "../../../editor/graph/utils";

import { Mesh } from "../../../editor/graph/mesh/mesh";
import { Camera } from "../../../editor/graph/camera/camera";
import { Sound } from "../../../editor/graph/sound/sound";
import { GetMesh } from "../../../editor/graph/mesh/get-mesh";
import { GetCamera } from "../../../editor/graph/camera/get-camera";

import { GraphContextMenu } from "../context-menu";
import GraphEditorWindow from "../index";
import { NodeCreator } from "../node-creator";

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

    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this.canvas = ref,
    };

    private _canvasFocused: boolean = false;
    private _graphInterval: Nullable<number> = null;
    private _pausedNode: Nullable<GraphNode> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IGraphProps) {
        super(props);

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
        const size = this.props.editor.getPanelSize("graph");
        if (size.width <= 0 || size.height <= 0) {
            return;
        }

        this.graphCanvas?.setDirty(true, true);
        this.graphCanvas?.resize(size.width, size.height);
    }

    /**
     * Called on the component did mount.
     */
    public async initGraph(jsonPath: string): Promise<void> {
        // Configure graph
        const json = await readJSON(jsonPath);
        this.graph = new LGraph();
        this.graph.configure(json, false);
        this.graph["scene"] = this.props.editor.preview.getScene();
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
        this.graphCanvas.render_canvas_border = false;
        this.graphCanvas.render_execution_order = true;
        this.graphCanvas.render_curved_connections = true;
        this.graphCanvas.highquality_render = true;

        this.graphCanvas.showSearchBox = (e: MouseEvent) => {
            setTimeout(() => this.addNode(e), 100);
        };

        this.graphCanvas.canvas.addEventListener('mouseover', () => this._canvasFocused = true);
        this.graphCanvas.canvas.addEventListener('mouseout', () => this._canvasFocused = false);

        this.graphCanvas.canvas.addEventListener("click", (e) => {
            const pos = this.graphCanvas!.convertEventToCanvasOffset(e);

            const node = this.graph?.getNodeOnPos(pos[0], pos[1]) as Undefinable<GraphNode>;
            if (node) { return this.props.editor.inspector.setNode(node); }

            const group = this.graph?.getGroupOnPos(pos[0], pos[1]) as Undefinable<LGraphGroup>;
            if (group) { return this.props.editor.inspector.setGroup(group); }
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
            if (event.key === 'c' && event.ctrlKey) {
                return this.graphCanvas?.copyToClipboard();
            }
            
            if (event.key === 'v' && event.ctrlKey) {
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

        for (const nodeId in this.graphCanvas.selected_nodes) {
            const node = this.graphCanvas.selected_nodes[nodeId];
            node.graph?.remove(node);
        }
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

        const node = LiteGraph.createNode(type);
        node.pos = this.graphCanvas!.convertEventToCanvasOffset(event);
        this.graph?.add(node, false);
    }

    /**
     * Removes the given group.
     * @param group defines the reference to the group to remove.
     */
    public removeGroup(group: LGraphGroup): void {
        this.graph?.remove(group);
    }

    /**
     * Adds a new group.
     * @param event defines the right-click event.
     */
    public addGroup(event: MouseEvent): void {
        const group = new LGraphGroup();
        const pos = this.graphCanvas!.convertEventToCanvasOffset(event);

        group.move(pos[0], pos[1], true);
        this.graph?.add(group);
    }

    /**
     * Removes the given link from the graph.
     * @param link defines the reference to the link to remove.
     */
    public removeLink(link: LLink): void {
        this.graph?.removeLink(link.id);
    }

    /**
     * Called on the graph is being started.
     */
    public start(scene: Scene): void {
        if (!this.graph || !this.graphCanvas) { return; }

        this.graph.hasPaused = false;
        this.graph["scene"] = scene;

        this.graph.status = LGraph.STATUS_RUNNING;
        this._getAllNodes().forEach((n) => n.onStart());

        this._graphInterval = setInterval(() => {
            if (NodeUtils.PausedNode !== this._pausedNode) {
                this._pausedNode = NodeUtils.PausedNode;
                this.props.editor.callStack.refresh();
            }

            if (!this.graph!.hasPaused) {
                this.graph!.runStep();
            }
        }, 0) as any;
    }

    /**
     * Stops the graph.
     */
    public stop(): void {
        if (!this.graph || !this.graphCanvas) { return; }

        if (this._graphInterval) {
            clearInterval(this._graphInterval);
        }

        this.graph.status = LGraph.STATUS_STOPPED;
        this._getAllNodes().forEach((n) => n.onStop());
        this.graph.hasPaused = false;
    }

    /**
     * Returns the list of all available nodes of the graph.
     */
    private _getAllNodes(): GraphNode[] {
        return this.graph!["_nodes"] as GraphNode[];
    }

    /**
     * Checks the graph.
     */
    private _checkGraph(): void {
        const check = GraphCodeGenerator._GenerateCode(this.graph!);
        if (check.error) {
            check.error.node.color = "#ff2222";
        } else {
            this._getAllNodes().forEach((n) => NodeUtils.SetColor(n));
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
    }
}
