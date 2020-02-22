import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

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
                        <Button key="previous" small={true} text="<" onClick={() => this._iframe?.contentWindow?.history.back()} />
                        <Button key="next" small={true} text=">" onClick={() => this._iframe?.contentWindow?.history.forward()} />
                        <Button key="refresh" small={true} text="Refresh" onClick={() => this._iframe!.src = this._iframe!.src} />
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
}
