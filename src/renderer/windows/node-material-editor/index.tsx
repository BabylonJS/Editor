import { ipcRenderer } from "electron";
import { Nullable } from "../../../shared/types";
import { IPCResponses, IPCRequests } from "../../../shared/ipc";

import * as React from "react";
import { NodeMaterial, Engine, Scene, Light } from "babylonjs";
import "babylonjs-loaders";

export const title = "Node Material Editor";

export default class NodeMaterialEditorWindow extends React.Component {
    private _div: Nullable<HTMLDivElement> = null;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;

    public constructor(props: any) {
        super(props);
        
        // Babylon.JS stuff
        this._canvas = document.createElement("canvas");
        this._canvas.style.visibility = "hidden";
        this._canvas.width = 100;
        this._canvas.height = 100;
        document.body.appendChild(this._canvas);

        this._engine = new Engine(this._canvas);
        this._scene = new Scene(this._engine);

        // Bind all events
        this._bindEvents();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div id="node-material-editor" style={{ width: "100%", height: "100%" }}></div>;
    }

    /**
     * Binds the ipc events.
     */
    private _bindEvents(): void {
        ipcRenderer.on(IPCRequests.SendWindowMessage, (_ , data) => {
            if (data.id !== "init") { return; }
            this._setMaterial(data.json, data.editorData, data.lights);
        });
    }

    /**
     * Called on a material has been selected in the editor.
     */
    private _setMaterial(json: any, editorData: any, lights: any[]): void {
        // alert("coucou !");
        this._div = document.getElementById("node-material-editor") as HTMLDivElement;
        if (!this._div) { return; }

        // Create lights
        lights.forEach((l) => Light.Parse(l, this._scene));

        // Create material
        json.editorData = editorData;
        const nodeMaterial = NodeMaterial.Parse(json, this._scene);

        nodeMaterial.onBuildObservable.add(() => this._saveMaterial(nodeMaterial));
        window.addEventListener("beforeunload", () => this._saveMaterial(nodeMaterial));

        const { NodeEditor } = require("babylonjs-node-editor");
        NodeEditor.Show({
            hostElement: this._div,
            nodeMaterial,
        });
        NodeEditor._CurrentState.onUpdateRequiredObservable.add(() => this._saveMaterial(nodeMaterial));
    }

    /**
     * Saves the node material.
     */
    private _saveMaterial(nodeMaterial: NodeMaterial): void {
        ipcRenderer.send(IPCResponses.SendWindowMessage, -1, {
            id: "node-material-json",
            json: nodeMaterial.serialize(),
            editorData: nodeMaterial.editorData,
        });
    }
}
