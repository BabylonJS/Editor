import { join } from "path";

import { Nullable } from "../../shared/types";

import { Scene, SceneLoader, Camera } from "babylonjs";

import Editor from "../editor";

import { aliases, workspaceConfiguration } from "../configuration";

import { WorkSpace } from "../editor/project/workspace";
import { SceneSettings } from "../editor/scene/settings";

import { PlayOverride } from "./override";

export class ScenePlayer {
    /**
     * @hidden
     */
    public _scene: Nullable<Scene> = null;
    
    private _editor: Editor;
    private _lastEditorCamera: Nullable<Camera> = null;

    /**
     * Constructor.
     * @param editor defines the reference to the editor.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
    }

    /**
     * Starts playing the scene in the editor: load the scene, apply attached scripts and return the reference to the scene.
     */
    public async start(progress: (p: number) => void): Promise<Scene> {
        PlayOverride.OverrideEngineFunctions(WorkSpace.DirPath!);

        // Configure aliases
        const aliasesKeys = Object.keys(aliases);
        aliasesKeys.forEach((k) => delete aliases[k]);

        const tsConfigPath = join(WorkSpace.DirPath!, "tsconfig.json");
        delete require.cache[tsConfigPath];

        const tsConfig = require(tsConfigPath);
        if (tsConfig.compilerOptions?.paths) {
            Object.assign(aliases, tsConfig.compilerOptions.paths);
        }

        workspaceConfiguration.dirPath = WorkSpace.DirPath!;

        // Load project
        this._scene = new Scene(this._editor.engine!);

        const rootUrl = join(WorkSpace.DirPath!, "assets/");
        const filename = join("../", WorkSpace.OutputSceneDirectory, "scenes", WorkSpace.GetProjectName(), "scene.babylon");

        this._requirePhysicsEngine();

        await SceneLoader.AppendAsync(rootUrl, filename, this._scene, (ev) => {
            progress(ev.loaded / ev.total);
        }, ".babylon");

        // Attach camera
        if (!this._scene.activeCamera) {
            throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
        }
        this._scene.activeCamera.attachControl(this._editor.engine!.getRenderingCanvas(), false);

        this._lastEditorCamera = this._editor.scene!.activeCamera;

        this._editor.scene!.activeCamera?.detachControl();
        this._editor.scene!.activeCamera = null;

        // Run scene's tools
        const sceneTools = require(join(WorkSpace.DirPath!, "build/src/scenes/tools.js"));
        sceneTools.runScene(this._scene, rootUrl);

        this.runRenderLoop();

        return this._scene;
    }

    /**
     * Starts rendering the play scene in the editor.
     */
    public runRenderLoop(): void {
        const engine = this._editor.engine!;

        this._scene?.executeWhenReady(() => {
            engine.runRenderLoop(() => {
                try {
                    this._scene?.render();
                } catch (e) {
                    this._editor.console.logSection("Play Error");
                    this._editor.console.logError(e.message);

                    engine.stopRenderLoop();
                    engine.wipeCaches(true);
                }
            });
        });
    }

    /**
     * Disposes the scene player by disposing the play scene, clear scene's scripts require cache
     * and reset the engine's cache.
     */
    public dispose(): void {
        PlayOverride.RestoreOverridenFunctions();

        const engine = this._editor.engine!;

        // Clear require cache for project        
        const workspacePath = WorkSpace.DirPath!.toLowerCase();
        const cachedPaths = Object.keys(require.cache);

        for (const c of cachedPaths) {
            const cachePath = c.replace(/\\/g, "/").toLowerCase();
            if (cachePath.indexOf(workspacePath) !== -1) {
                delete require.cache[c];
            }
        }

        if (this._lastEditorCamera) {
            this._editor.scene!.activeCamera = this._lastEditorCamera;
            SceneSettings.AttachControl(this._editor, this._lastEditorCamera);
        }
        this._lastEditorCamera = null;

        // Stop render and dispose play scene.
        engine.stopRenderLoop();
        this._scene?.dispose();
        this._scene = null;
        engine.wipeCaches(true);
    }

    /**
     * Requries the intended physics engine.
     */
    private _requirePhysicsEngine(): void {
        switch (WorkSpace.Workspace!.physicsEngine) {
            case "cannon":
                window["CANNON"] = require("cannon");
                break;
            case "oimo":
                window["OIMO"] = require("babylonjs/Oimo.js");
                break;
            case "ammo":
                window["Ammo"] = require(join(__dirname, "../../../../html/libs/ammo.js"));
                break;
        }
    }
}
