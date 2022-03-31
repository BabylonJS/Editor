import { readJSON } from "fs-extra";

import { Nullable } from "../../../shared/types";

import * as React from "react";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

import { Observable } from "babylonjs";
import { GUIEditor } from "babylonjs-gui-editor";
import { AdvancedDynamicTexture } from "babylonjs-gui";

export const title = "GUI Editor";

export default class GUIEditorPlugin extends AbstractEditorPlugin<{}> {
    private _div: Nullable<HTMLDivElement> = null;
    private _texture: Nullable<AdvancedDynamicTexture> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div ref={(r) => this._div = r} style={{ width: "100%", height: "100%", padding: "0", margin: "0", overflow: "hidden" }}>
                {/* GUI Editor will be put here. */}
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public async onReady(): Promise<void> {
        if (!this.props.openParameters || !this._div) {
            return this.editor.closePlugin("gui-editor");
        }

        const parsedData = await readJSON(this.props.openParameters, { encoding: "utf-8" });

        this._texture = AdvancedDynamicTexture.CreateFullscreenUI("editor-ui", true, this.editor.scene!, AdvancedDynamicTexture.TRILINEAR_SAMPLINGMODE, true);
        this._texture.parseContent(parsedData, true);

        // Create gui editor.
        GUIEditor.Show({
            hostElement: this._div,
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
     * Called on the plugin is closed.
     */
    public onClose(): void {
        this._texture?.dispose();
    }
}
