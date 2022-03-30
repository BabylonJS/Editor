import { Nullable } from "../../../shared/types";

import * as React from "react";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

import { GUIEditor } from "babylonjs-gui-editor";
import { AdvancedDynamicTexture } from "babylonjs-gui";
import { readJSON } from "fs-extra";

export const title = "GUI Editor";

export default class PreviewPlugin extends AbstractEditorPlugin<{ }> {
	private _div: Nullable<HTMLDivElement> = null;
    private _texture: Nullable<AdvancedDynamicTexture> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div ref={(r) => this._div = r} style={{ width: "100%", height: "calc(100% - 100px)" }}>
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

        this._texture = new AdvancedDynamicTexture("ui-editor", 128, 128, this.editor.scene!, false);
        this._texture.parseContent(parsedData, true);

		// Create node material editor.
		GUIEditor.Show({
            hostElement: this._div,
            liveGuiTexture: this._texture,
            customLoad: {
                label: "Load from Editor's assets",
                action: (d) => {
                    debugger;
                    return Promise.resolve(d);
                },
            },
            customSave: {
                label: "Save to Editor's assets",
                action: (d) => {
                    debugger;
                    return Promise.resolve(d);
                },
            },
        });
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Empty for now...
    }
}
