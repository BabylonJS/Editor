import { ipcRenderer } from "electron";
import { readJSON } from "fs-extra";

import { Nullable } from "../../../shared/types";
import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import { Button } from "@blueprintjs/core";

import { LGraph, LGraphCanvas, LGraphNode, LGraphGroup, LiteGraph } from "litegraph.js";

import { GraphCode } from "../../editor/graph/graph";
import { GraphCodeGenerator } from "../../editor/graph/generate";

import { GraphContextMenu } from "./context-menu";
import { NodeCreator } from "./node-creator";

export const title = "Graph Editor";

export default class GraphEditorWindow extends React.Component {
    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this._canvas = ref,
    };

    private _path: Nullable<string> = null;

    private _graph: Nullable<LGraph> = null;
    private _graphCanvas: Nullable<LGraphCanvas> = null;

    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);

        GraphCode.Init();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <Button small={true} text="Save" onClick={() => this._save()} />
                    <Button small={true} text="Generate Code" onClick={() => this._generateCode()} />
                </div>
                <div style={{ width: "100%", height: "calc(100% - 25px)" }}>
                    <canvas ref={this._refHandler.getCanvas} className="graphcanvas" style={{ width: "100%", height: "calc(100% - 25px)", position: "absolute", top: "25" }}></canvas>
                </div>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._canvas) { return; }

        // Create graph
        this._graph = new LGraph();

        // Create graph canvas
        this._graphCanvas = new LGraphCanvas(this._canvas, this._graph, {
            autoresize: true,
            skip_render: false,
        });
        this._graphCanvas.render_canvas_border = false;
        this._graphCanvas.render_execution_order = true;

        this._graphCanvas.showSearchBox = (e: MouseEvent) => {
            this.addNode(e);
        };
        this._graphCanvas.processContextMenu = (n, e: MouseEvent) => {
            if (n) {
                return GraphContextMenu.ShowNodeContextMenu(n, e, this);
            }

            const pos = this._graphCanvas!.convertEventToCanvasOffset(e);
            const group = this._graph?.getGroupOnPos(pos[0], pos[1]);
            if (group) {
                return GraphContextMenu.ShowGroupContextMenu(group, e, this);
            }

            GraphContextMenu.ShowGraphContextMenu(e, this);
        };
    }

    /**
     * Inits the plugin.
     * @param path defines the path of the JSON graph to load.
     */
    public async init(path: string): Promise<void> {
        this._path = path;

        const json = await readJSON(path);
        this._graph?.configure(json, false);
    }

    /**
     * Called on the window is being closed.
     */
    public onClose(): void {
        this._save(true);
    }

    /**
     * Clones the given node.
     * @param node defines the reference to the node that must be cloned.
     */
    public cloneNode(node: LGraphNode): void {
        node.graph?.add(node.clone());
    }

    /**
     * Removes the given node.
     * @param node defines the reference to the node that must be removed.
     */
    public removeNode(node: LGraphNode): void {
        node.graph?.remove(node);
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
        node.pos = this._graphCanvas!.convertEventToCanvasOffset(event);
        this._graph?.add(node, false);
    }

    /**
     * Removes the given group.
     * @param group defines the reference to the group to remove.
     */
    public removeGroup(group: LGraphGroup): void {
        this._graph?.remove(group as any); // TODO: fix litegraph.js typings
    }

    /**
     * Adds a new group.
     * @param event defines the right-click event.
     */
    public addGroup(event: MouseEvent): void {
        const group = new LGraphGroup();
        const pos = this._graphCanvas!.convertEventToCanvasOffset(event);

        group.move(pos[0], pos[1], true);
        this._graph?.add(group as any); // TODO: fix litegraph.js typings.
    }

    /**
     * Saves the current graph.
     */
    private _save(closed: boolean = false): void {
        ipcRenderer.send(IPCResponses.SendWindowMessage, -1, {
            id: "graph-json",
            path: this._path,
            json: this._graph?.serialize(),
            closed,
        });
    }

    /**
     * Converts the current graph into code.
     */
    private _generateCode(): void {
        const str = GraphCodeGenerator.GenerateCode(this._graph!);
        console.log(str);
    }
}
