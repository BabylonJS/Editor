import { Undefinable } from "../../../shared/types";

import * as React from "react";

import { EngineView, Camera } from "babylonjs";

import { Tools } from "../../editor/tools/tools";
import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

export const title = "Preview";

export interface IPreviewPluginState {
    /**
     * Defines the id of the canvas.
     */
    canvasId: string;
}

export default class PreviewPlugin extends AbstractEditorPlugin<IPreviewPluginState> {
    private _view: Undefinable<EngineView> = undefined;
    private _camera: Undefinable<Camera> = undefined;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);
        this.state = { canvasId: Tools.RandomId() };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <canvas id={this.state.canvasId} style={{ width: "100%", height: "100%", position: "absolute", top: "0", touchAction: "none" }}></canvas>;
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        this._view = this.editor.engine!.registerView(
            document.getElementById(this.state.canvasId) as HTMLCanvasElement,
            this._camera,
        );

        this.editor.scene!.activeCamera?.attachControl(this.editor.engine!.getRenderingCanvas()!);
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        if (this._camera) { this._camera.dispose(); }
        if (this._view) { this.editor.engine!.unRegisterView(document.getElementById(this.state.canvasId) as HTMLCanvasElement); }
    }
}

