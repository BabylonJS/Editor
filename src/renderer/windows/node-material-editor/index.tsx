import { writeJSON } from "fs-extra";
import { extname } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Menu, MenuItem, ButtonGroup, Popover, Button, Position, Toaster, Intent } from "@blueprintjs/core";

import { NodeMaterial, Engine, Scene, Light } from "babylonjs";
import "babylonjs-loaders";

import { IPCTools } from "../../editor/tools/ipc";

import { Icon } from "../../editor/gui/icon";
import { Tools } from "../../editor/tools/tools";

export const title = "Node Material Editor";

export default class NodeMaterialEditorWindow extends React.Component {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _material: NodeMaterial;
    
    private _editorDiv: Nullable<HTMLDivElement> = null;
    private _toaster: Nullable<Toaster> = null;
    private _refHandler = {
        getEditorDiv: (ref: HTMLDivElement) => this._editorDiv = ref,
        getToaster: (ref: Toaster) => this._toaster = ref,
    };

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
        const file =
            <Menu>
                <MenuItem text="Save (CTRL + S)" icon={<Icon src="copy.svg" />} onClick={() => this._saveMaterial(this._material)} />
                <MenuItem text="Save As..." icon={<Icon src="copy.svg" />} onClick={() => this._saveAs(this._material)} />
            </Menu>;

        return (
            <>
                <div className="bp3-dark" style={{ width: "100%", height: "35px", backgroundColor: "#444444" }}>
                    <ButtonGroup style={{ paddingTop: "4px" }}>
                        <Popover content={file} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="folder-open.svg"/>} rightIcon="caret-down" text="File"/>
                        </Popover>
                    </ButtonGroup>
                </div>
                <div ref={this._refHandler.getEditorDiv} style={{ width: "100%", height: "calc(100% - 35px)" }}></div>
                <Toaster canEscapeKeyClear={true} position={Position.TOP_RIGHT} ref={this._refHandler.getToaster}></Toaster>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._bindEvents();
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
        IPCTools.SendWindowMessage<{ error: Boolean; }>(-1, "node-material-json", {
            closed: true,
        });
    }

    /**
     * Called on a material has been selected in the editor.
     */
    private _setMaterial(json: any, editorData: any, lights: any[]): void {
        if (!this._editorDiv) { return; }

        // Create lights
        lights.forEach((l) => Light.Parse(l, this._scene));

        // Create material
        json.editorData = editorData;
        this._material = NodeMaterial.Parse(json, this._scene);

        // Create node material editor.
        const { NodeEditor } = require("babylonjs-node-editor");
        NodeEditor.Show({
            hostElement: this._editorDiv,
            nodeMaterial: this._material,
        });
    }

    /**
     * Saves the node material.
     */
    private async _saveMaterial(nodeMaterial: Nullable<NodeMaterial>, closed: boolean = false): Promise<void> {
        if (!nodeMaterial) { return; }

        const result = await IPCTools.SendWindowMessage<{ error: Boolean; }>(-1, "node-material-json", {
            json: nodeMaterial.serialize(),
            editorData: nodeMaterial.editorData,
            closed,
        });

        if (result.data.error) {
            this._toaster?.show({ message: "Failed to save.", intent: Intent.DANGER, timeout: 1000 });
        } else {
            this._toaster?.show({ message: "Saved.", intent: Intent.SUCCESS, timeout: 1000 });
        }
    }

    /**
     * Saves the given material as...
     */
    private async _saveAs(nodeMaterial: Nullable<NodeMaterial>): Promise<void> {
        if (!nodeMaterial) { return; }

        let path = await Tools.ShowSaveFileDialog("Save Node Material As...");

        const extension = extname(path);
        if (extension.toLowerCase() !== ".json") {
            path += ".json";
        }

        await writeJSON(path, nodeMaterial.serialize());
        this._toaster?.show({ message: "Saved.", intent: Intent.SUCCESS, timeout: 1000 });
    }

    /**
     * Binds all the events.
     */
    private _bindEvents(): void {
        // Shortcuts
        window.addEventListener("keyup", (ev) => {
            if ((ev.ctrlKey || ev.metaKey) && ev.key === "s") { return this._saveMaterial(this._material); }
        });
    }
}
