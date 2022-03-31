import { ipcRenderer } from "electron";
import { writeJSON } from "fs-extra";
import { extname } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Menu, MenuItem, ButtonGroup, Popover, Button, Position, Toaster, Intent } from "@blueprintjs/core";

import { GUIEditor } from "babylonjs-gui-editor";
import { Engine, Observable, Scene } from "babylonjs";
import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Tools } from "../../editor/tools/tools";
import { IPCTools } from "../../editor/tools/ipc";
import { GUITools } from "../../editor/tools/gui";

import { Icon } from "../../editor/gui/icon";

export const title = "GUI Editor";

export default class GUIEditorWindow extends React.Component {
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _texture: AdvancedDynamicTexture;

    private _relativePath: string;

    private _toaster: Nullable<Toaster> = null;
    private _editorDiv: Nullable<HTMLDivElement> = null;

    public constructor(props: any) {
        super(props);

        // Babylon.JS stuff
        this._canvas = document.createElement("canvas");
        this._canvas.style.visibility = "hidden";
        this._canvas.width = 1920;
        this._canvas.height = 1080;
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
                <MenuItem text="Save (CTRL + S)" icon={<Icon src="copy.svg" />} onClick={() => this._saveGui(this._texture)} />
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
                <div ref={(r) => this._editorDiv = r} style={{ width: "100%", height: "calc(100% - 100px)", /*padding: "0", margin: "0", overflow: "hidden"*/ }} />
                <Toaster canEscapeKeyClear={true} position={Position.TOP_RIGHT} ref={(r) => this._toaster = r}></Toaster>
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
     * @param data the initialization data containing the gui texture definition etc.
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
     * Called on a texture has been selected in the editor.
     */
    private _setTexture(json: any): void {
        if (!this._editorDiv) { return; }

        // Create ui texture
        this._texture = AdvancedDynamicTexture.CreateFullscreenUI("editor-ui", true, this._scene, AdvancedDynamicTexture.TRILINEAR_SAMPLINGMODE, true);
        this._texture.parseContent(json, true);

        document.title = `GUI Editor - ${this._texture.name}`;

        // Create gui editor.
        GUIEditor.Show({
            hostElement: this._editorDiv,
            liveGuiTexture: this._texture,
            customLoadObservable: new Observable(),
            customLoad: {
                label: "Editor's custom load",
                action: (d) => Promise.resolve(d),
            },
            customSave: {
                label: "Editor's custom save",
                action: (d) => Promise.resolve(d),
            },
        });
    }

    /**
     * Saves the gui texture.
     */
    private async _saveGui(texture: Nullable<AdvancedDynamicTexture>, closed: boolean = false): Promise<void> {
        if (!texture) { return; }

        try {
            const json = this._texture.serializeContent();

            const result = await IPCTools.SendWindowMessage<{ error: Boolean; }>(-1, "gui-json", {
                closed,
                relativePath: this._relativePath,
                json: GUITools.CleanSerializedGUI(json),
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
     * Saves the given gui texture as...
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
        ipcRenderer.on("save", () => this._saveGui(this._texture));
        ipcRenderer.on("save-as", () => this._saveAs(this._texture));
    }
}
