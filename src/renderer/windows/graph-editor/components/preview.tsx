import { join, relative } from "path";
import { tmpdir } from "os";
import { mkdtemp, writeJson, rmdir, remove } from "fs-extra";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Callout, Intent } from "@blueprintjs/core";

import { Engine, Scene, SceneLoader } from "babylonjs";
import "babylonjs-materials";
import "babylonjs-procedural-textures";

import { IPCTools } from "../../../editor/tools/ipc";

import GraphEditorWindow from "../index";
import { Icon } from "../../../editor/gui/icon";

export interface IPreviewProps {
    /**
     * Defines the reference to the editor's window main class.
     */
    editor: GraphEditorWindow;
}

export interface IPreviewState {
    /**
     * Defines wether or not the panel should draw a welcome message.
     */
    welcome: boolean;
}

export class Preview extends React.Component<IPreviewProps, IPreviewState> {
    /**
     * Defines the reference to the canvas used to draw the graph.
     */
    public canvas: HTMLCanvasElement;

    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this.canvas = ref,
    };

    private _engine: Nullable<Engine> = null;
    private _scene: Nullable<Scene> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IPreviewProps) {
        super(props);

        props.editor.preview = this;
        
        this.state = { welcome: true };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let welcome: React.ReactNode;
        if (this.state.welcome) {
            welcome = (
                <Callout title="Preview" style={{ height: "100%" }} intent={Intent.SUCCESS} icon="info-sign">
                    <h3 style={{ color: "white" }}>
                        This panel (Preview) draws the current scene when the graph is started and is used to preview the graph results.
                        <br />
                        You can click on the <Icon src="play.svg" /> to play the graph.
                    </h3>
                    <Icon
                        src="play.svg"
                        style={{ position: "absolute", left: "50%", bottom: "50%", opacity: "0.5", transform: "translate(-50%, 50%)", width: "100px", height: "100px" }}
                        onOver={(e) => e.currentTarget.style.opacity = "1" }
                        onLeave={(e) => e.currentTarget.style.opacity = "0.5" }
                        onClick={() => this.props.editor.start(false)}
                    />
                </Callout>
            );
        }

        return (
            <>
                <canvas ref={this._refHandler.getCanvas} style={{ width: "100%", height: "100%", position: "absolute", top: "0" }}></canvas>
                {welcome}
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        // Nothing to do at the moment.
    }

    /**
     * Called on the window or layout is resized.
     */
    public resize(): void {
        this._engine?.resize();
    }

    /**
     * Gets the current scene.
     */
    public getScene(): Scene {
        return this._scene!;
    }

    /**
     * Stops the preview.
     */
    public stop(): void {
        this._disposeSceneAndEngine();

        this._scene = null;
        this._engine = null;

        this.setState({ welcome: true });
    }

    /**
     * Resets the preview.
     */
    public async reset(): Promise<void> {
        this.setState({ welcome: false });

        if (!this.canvas) { return; }

        this._disposeSceneAndEngine();

        this._engine = new Engine(this.canvas, true, {
            audioEngine: true,
        });
        this._scene = new Scene(this._engine);

        const json = await IPCTools.ExecuteEditorFunction<{ rootUrl: string; scene: any; }>("sceneUtils.getSceneJson");

        const tempDir = await mkdtemp(join(tmpdir(), "babylonjs-editor"));
        const sceneDest = join(tempDir, "scene.babylon");
        await writeJson(sceneDest, json.data.scene);

        const sceneFileName = join(relative(json.data.rootUrl, tempDir), "scene.babylon");

        // Load scene
        await SceneLoader.AppendAsync(json.data.rootUrl, sceneFileName, this._scene, null, "babylon");

        // Attach controls to camera
        this._scene.activeCamera?.attachControl(this.canvas, false);

        // Remove temp files.
        try {
            await remove(sceneDest);
            await rmdir(tempDir);
        } catch (e) {
            console.error("Failed to remove tmp dir", e);
        }

        // Run!
        this._engine.runRenderLoop(() => {
            if (this.props.editor.graph.graph?.hasPaused) { return; }
            this._scene?.render();
        });

        return new Promise<void>((resolve) => {
            this._scene?.executeWhenReady(() => resolve());
        });
    }

    /**
     * Disposes the current scene and engine is they exist.
     */
    private _disposeSceneAndEngine(): void {
        if (this._scene) {
            try { this._scene.dispose(); } catch (e) { /* Catch silently */ }
        }

        if (this._engine) {
            this._engine.stopRenderLoop();
            try { this._engine.dispose(); } catch (e) { /* Catch silently */ }
        }
    }
}
