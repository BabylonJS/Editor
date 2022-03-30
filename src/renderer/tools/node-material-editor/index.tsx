import { Nullable } from "../../../shared/types";

import * as React from "react";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

import { NodeEditor } from "babylonjs-node-editor";

export const title = "Node Material Editor";

export default class PreviewPlugin extends AbstractEditorPlugin<{ }> {
	private _div: Nullable<HTMLDivElement> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div ref={(r) => this._div = r} style={{ width: "100%", height: "100%" }}>
				{/* Node Material Editor will be put here. */}
			</div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public async onReady(): Promise<void> {
		if (!this.props.openParameters || !this._div) {
			return this.editor.closePlugin("node-material-editor");
		}

		// Create node material editor.
		NodeEditor.Show({ hostElement: this._div, nodeMaterial: this.props.openParameters });
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Empty for now...
    }
}
