import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";
import { shell } from "electron";

export const title = "Documentation";

export default class PreviewPlugin extends AbstractEditorPlugin<{ }> {
    private _iframe: Nullable<HTMLIFrameElement> = null;
    private _refHandler = {
        getIFrame: (ref: HTMLIFrameElement) => this._iframe = ref,
    };

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="open-browser" small={true} icon="document-open" text="Open In Browser" onClick={() => this._handleOpenInBrowser()} />
                    </ButtonGroup>
                </div>
                <iframe
                    ref={this._refHandler.getIFrame}
                    src="https://doc.babylonjs.com/resources/"
                    style={{ width: "100%", height: "calc(100% - 30px)" }}
                ></iframe>
            </>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        // Empty for now...
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Empty for now...
    }

    /**
     * Called on the user wants to open the documentation in his browser.
     */
    private _handleOpenInBrowser(): void {
        if (!this._iframe) { return; }

        shell.openExternal(this._iframe.src);
        this.editor.closePlugin(title);
    }
}
