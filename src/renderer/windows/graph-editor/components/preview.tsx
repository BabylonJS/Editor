import { join, relative, dirname, extname } from "path";
import { tmpdir } from "os";
import { mkdtemp, writeJson, rmdir, remove } from "fs-extra";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Callout, Intent, Spinner } from "@blueprintjs/core";

import { Engine, Scene, SceneLoader } from "babylonjs";
import "babylonjs-materials";
import "babylonjs-procedural-textures";

import { Icon } from "../../../editor/gui/icon";

import { IPCTools } from "../../../editor/tools/ipc";

import { ISceneJsonResult } from "../../../editor/scene/utils";

import GraphEditorWindow from "../index";

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
    /**
     * Defines wether or not the scene is loading.
     */
    loadingScene: boolean;
}

export class Preview extends React.Component<IPreviewProps, IPreviewState> {
    /**
     * Defines the reference to the canvas used to draw the graph.
     */
    public canvas: HTMLCanvasElement;
    /**
     * Defines the reference to the Babylon.JS engine.
     */
    public engine: Nullable<Engine> = null;
    /**
     * Defines the reference to the Babylon.JS scene.
     */
    public scene: Nullable<Scene> = null;

    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this.canvas = ref,
    };

    private _editor: GraphEditorWindow;
    private _requiredScriptsPaths: string[] = [];

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IPreviewProps) {
        super(props);

        this.state = { welcome: true, loadingScene: false };

        this._editor = props.editor;
        this._editor.preview = this;
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
                        onClick={() => this._editor.start(false)}
                    />
                </Callout>
            );
        }

        let loadingSpinner: React.ReactNode;
        if (this.state.loadingScene) {
            loadingSpinner = (
                <div style={{ width: "100%", height: "100%" }}>
                    <div style={{ marginTop: "100px" }}>
                        <Spinner size={200} />
                        <h1 style={{ color: "grey", textAlign: "center" }}>Loading...</h1>
                    </div>
                </div>
            );
        }

        return (
            <>
                <canvas ref={this._refHandler.getCanvas} style={{ width: "100%", height: "100%", position: "absolute", top: "0" }}></canvas>
                {welcome}
                {loadingSpinner}
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
        this.engine?.resize();
    }

    /**
     * Gets the current scene.
     */
    public getScene(): Scene {
        return this.scene!;
    }

    /**
     * Stops the preview.
     */
    public stop(): void {
        this._disposeSceneAndEngine();

        this.scene = null;
        this.engine = null;

        this.setState({ welcome: true });
    }

    /**
     * Resets the preview.
     * @param standalone defines wehter or not only the current graph will be executed.
     */
    public async reset(standalone: boolean): Promise<void> {
        this.setState({ welcome: false, loadingScene: true });

        if (!this.canvas) { return; }

        this._disposeSceneAndEngine();

        this.engine = new Engine(this.canvas, true, {
            audioEngine: true,
        });
        this.scene = new Scene(this.engine);

        const json = await IPCTools.ExecuteEditorFunction<ISceneJsonResult>("sceneUtils.getSceneJson");

        const tempDir = await mkdtemp(join(tmpdir(), "babylonjs-editor"));
        const sceneDest = join(tempDir, "scene.babylon");
        await writeJson(sceneDest, json.data.scene);

        const sceneFileName = join(relative(json.data.rootUrl, tempDir), "scene.babylon");

        // Load scene
        this.setState({ loadingScene: false });
        await SceneLoader.AppendAsync(json.data.rootUrl, sceneFileName, this.scene, null, ".babylon");

        // Attach controls to camera
        this.scene.activeCamera?.attachControl(this.canvas, false);

        // Remove temp files.
        try {
            await remove(sceneDest);
            await rmdir(tempDir);
        } catch (e) {
            console.error("Failed to remove tmp dir", e);
        }

        // Clear previously loaded scripts
        this._clearRequireCache();

        // Attach scripts
        if (!standalone) {
            this._attachScripts(json.data);
        }

        // Run!
        this.engine.runRenderLoop(() => {
            if (this._editor.graph.graph?.hasPaused) { return; }
            this.scene?.render();
        });

        return new Promise<void>((resolve) => {
            this.scene?.executeWhenReady(() => resolve());
        });
    }

    /**
     * Disposes the current scene and engine is they exist.
     */
    private _disposeSceneAndEngine(): void {
        if (this.scene) {
            try { this.scene.dispose(); } catch (e) { /* Catch silently */ }
        }

        if (this.engine) {
            this.engine.stopRenderLoop();
            try { this.engine.dispose(); } catch (e) { /* Catch silently */ }
        }
    }

    /**
     * Clears the require cache.
     */
    private _clearRequireCache(): void {
        for (const c in require.cache) {
            const cachePath = c.replace(/\\/g, "/");
            if (this._requiredScriptsPaths.indexOf(cachePath) !== -1) {
                delete require.cache[c];
            }
        }

        this._requiredScriptsPaths = [];
    }

    /**
     * Attaches the scripts to the current scene.
     */
    private _attachScripts(json: ISceneJsonResult): void {
        try {
            const scriptsMapPath = join(json.workspacePath, "build/src/scenes/scripts-map.js");
            const scriptsMap = require(scriptsMapPath);

            const sceneUtilsPath = join(json.workspacePath, "build/src/scenes", json.sceneName, "index.js");
            const sceneUtils = require(sceneUtilsPath);

            this._requiredScriptsPaths.push(scriptsMapPath);
            this._requiredScriptsPaths.push(sceneUtilsPath);

            // Clear graphs.
            for (const script in scriptsMap.scriptsMap) {
                if (script === this._editor.linkPath) {
                    delete scriptsMap.scriptsMap[script];
                } else {
                    const scriptPath = script.replace(join("src/scenes", json.sceneName), "");
                    const extension = extname(scriptPath);

                    this._requiredScriptsPaths.push(join(dirname(sceneUtilsPath), scriptPath.replace(extension, ".js")));
                }
            }

            sceneUtils.runScene(this.scene);
        } catch (e) {
            this._clearRequireCache();
            this._editor.logs.log(e.message);
        }
    }
}
