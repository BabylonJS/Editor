import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";
import { WorkSpace } from "../../editor/project/workspace";

export const title = "Play";

export default class PlayPlugin extends AbstractEditorPlugin<{ }> {
    private _iframe: Nullable<HTMLIFrameElement> = null;
    private _refHandler = {
        getIFrame: (ref: HTMLIFrameElement) => this._iframe = ref,
    };

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!WorkSpace.Workspace) { return; }

        const iframeUrl = `http://localhost:${WorkSpace.Workspace.serverPort}/`;
        return (
            <>
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh" small={true} icon="refresh" text="Refresh" onClick={() => this._handleRefresh()} />
                    </ButtonGroup>
                </div>
                <iframe ref={this._refHandler.getIFrame} src={iframeUrl} style={{ width: "100%", height: "calc(100% - 25px)" }}></iframe>
            </>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {

    }

    /**
     * Called on the user wants to refresh.
     */
    private _handleRefresh(): void {
        if (!this._iframe) { return; }

        this._iframe.src = this._iframe.src;
    }
}
