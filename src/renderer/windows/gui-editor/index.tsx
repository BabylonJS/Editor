import { ipcRenderer } from "electron";
import { writeJSON } from "fs-extra";
import { extname } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Menu, MenuItem, ButtonGroup, Popover, Button, Position, Toaster, Intent } from "@blueprintjs/core";

import { Engine, Scene } from "babylonjs";
import { GUIEditor } from "babylonjs-gui-editor";
import { AdvancedDynamicTexture } from "babylonjs-gui";

import { IPCTools } from "../../editor/tools/ipc";

import { Icon } from "../../editor/gui/icon";
import { Tools } from "../../editor/tools/tools";

import "../../editor/assets/materials/augmentations";

export const title = "Node Material Editor";

export default class NodeMaterialEditorWindow extends React.Component {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _texture: AdvancedDynamicTexture;

    private _relativePath: string;

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
                <MenuItem text="Save (CTRL + S)" icon={<Icon src="copy.svg" />} onClick={() => this._saveMaterial(this._texture)} />
                <MenuItem text="Save As..." icon={<Icon src="copy.svg" />} onClick={() => this._saveAs(this._texture)} />
            </Menu>;

        return (
            <>
                <div className="bp3-dark" style={{ width: "100%", height: "35px", backgroundColor: "#444444" }}>
                    <ButtonGroup style={{ paddingTop: "4px" }}>
                        <Popover content={file} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="folder-open.svg" />} rightIcon="caret-down" text="File" />
                        </Popover>
                    </ButtonGroup>
                </div>
                <div ref={this._refHandler.getEditorDiv} style={{ width: "100%", height: "calc(100% - 100px)" }}></div>
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
    public init(data: { json: any; relativePath: string; }): void {
        this._relativePath = data.relativePath;

        this._setTexture(data.json);
    }

    /**
     * Called on the window is being closed.
     */
    public onClose(): void {
        IPCTools.SendWindowMessage<{ error: Boolean; }>(-1, "gui-json", {
            closed: true,
            relativePath: this._relativePath,
        });
    }

    /**
     * Called on a material has been selected in the editor.
     */
    private _setTexture(json: any): void {
        if (!this._editorDiv) { return; }

        // Create material
        this._texture = new AdvancedDynamicTexture("editor-ui", 100, 100, this._scene, false);
        this._texture.parseContent(json, false);

        document.title = `GUI Editor - ${this._texture.name}`;

        // Create node material editor.
        GUIEditor.Show({
            hostElement: this._editorDiv,
            liveGuiTexture: this._texture,
            customLoad: {
                label: "",
                action: async (d) => {
                    debugger;
                    return d;
                }
            },
            customSave: {
                label: "",
                action: async (d) => {
                    debugger;
                    return d;
                }
            }
        });
    }

    /**
     * Saves the node material.
     */
    private async _saveMaterial(texture: Nullable<AdvancedDynamicTexture>, closed: boolean = false): Promise<void> {
        if (!texture) { return; }

        try {
            const result = await IPCTools.SendWindowMessage<{ error: Boolean; }>(-1, "gui-json", {
                closed,
                json: texture.serializeContent(),
                relativePath: this._relativePath,
            });
    
            if (result.data.error) {
                this._toaster?.show({ message: "Failed to save.", intent: Intent.DANGER, timeout: 1000 });
            } else {
                this._toaster?.show({ message: "Saved.", intent: Intent.SUCCESS, timeout: 1000 });
            }
        } catch (e) {
            this._toaster?.show({ message: "Failed to save.", intent: Intent.DANGER, timeout: 1000 });
        }
    }

    /**
     * Saves the given material as...
     */
    private async _saveAs(texture: Nullable<AdvancedDynamicTexture>): Promise<void> {
        if (!texture) { return; }

        let path = await Tools.ShowSaveFileDialog("Save GUI As...");

        const extension = extname(path);
        if (extension.toLowerCase() !== ".gui") {
            path += ".gui";
        }

        await writeJSON(path, texture.serializeContent());
        this._toaster?.show({ message: "Saved.", intent: Intent.SUCCESS, timeout: 1000 });
    }

    /**
     * Binds all the events.
     */
    private _bindEvents(): void {
        // Shortcuts
        ipcRenderer.on("save", () => this._saveMaterial(this._texture));
        ipcRenderer.on("save-as", () => this._saveAs(this._texture));
    }
}
