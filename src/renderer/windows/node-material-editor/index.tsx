import { ipcRenderer } from "electron";

import { Nullable } from "../../../shared/types";
import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import { NodeMaterial, Engine, Scene, Light } from "babylonjs";
import "babylonjs-loaders";

export const title = "Node Material Editor";

export default class NodeMaterialEditorWindow extends React.Component {
    private _div: Nullable<HTMLDivElement> = null;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _material: NodeMaterial;

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
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div id="node-material-editor" style={{ width: "100%", height: "100%" }}></div>;
    }

    /**
     * Inits the plugin.
     * @param data the initialization data containing the material definition etc.
     */
    public init(data: { json: any, lights: any[], editorData: any }): void {
        this._setMaterial(data.json, data.editorData, data.lights);
    }

    /**
     * Called on the window is being closed.
     */
    public onClose(): void {
        this._saveMaterial(this._material, true);
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
        this._material = NodeMaterial.Parse(json, this._scene);

        this._material.onBuildObservable.add(() => this._saveMaterial(this._material));

        // Create node material editor.
        const { NodeEditor } = require("babylonjs-node-editor");
        NodeEditor.Show({
            hostElement: this._div,
            nodeMaterial: this._material,
        });
        NodeEditor._CurrentState.onUpdateRequiredObservable.add(() => this._saveMaterial(this._material));
    }

    /**
     * Saves the node material.
     */
    private _saveMaterial(nodeMaterial: NodeMaterial, closed: boolean = false): void {
        ipcRenderer.send(IPCResponses.SendWindowMessage, -1, {
            id: "node-material-json",
            json: nodeMaterial.serialize(),
            editorData: nodeMaterial.editorData,
            closed,
        });
    }
}
