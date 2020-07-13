import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Tools } from "../../../editor/tools/tools";
import { DecalsPainter } from "../../../editor/painting/decals/decals";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../../editor/tools/plugin";

import { DecalsPainterInspector } from "./inspector";

export const title = "Decals Painter";

export default class PreviewPlugin extends AbstractEditorPlugin<{ }> {
    private _tool: Nullable<DecalsPainterInspector> = null;
    private _refHandler = {
        getTool: (ref: DecalsPainterInspector) => this._tool = ref,
    };

    private _toolId: string = Tools.RandomId();
    private _painter: Nullable<DecalsPainter> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        if (this.editor.isInitialized) {
            this._painter = new DecalsPainter(this.editor);
        } else {
            this.editor.editorInitializedObservable.addOnce(() => {
                this._painter = new DecalsPainter(this.editor);
                this.forceUpdate(() => this.resize());
            });
        }
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let inspector: React.ReactNode = null;
        if (this._painter) {
            inspector = <DecalsPainterInspector ref={this._refHandler.getTool} toolId={this._toolId} editor={this.editor} _objectRef={this._painter} />;
        }

        return (
            <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                {inspector}
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        this.resize();
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        this._painter?.dispose();
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        const size = this.editor.getPanelSize(title);
        if (size) {
            this._tool?.resize(size);
        }
    }

    /**
     * Called on the plugin was previously hidden and is now shown.
     */
    public onShow(): void {
        super.onShow();
        if (this._painter) { this._painter.enabled = true; }
    }
    
    /**
     * Called on the plugin was previously visible and is now hidden.
     */
    public onHide(): void {
        super.onHide();
        if (this._painter) { this._painter.enabled = false; }
    }
}
