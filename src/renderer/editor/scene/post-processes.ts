import { watch } from "chokidar";
import { dirname, join } from "path";
import { FSWatcher, readFile } from "fs-extra";

import { IStringDictionary } from "../../../shared/types";

import { Effect, MotionBlurPostProcess, PostProcess, ScreenSpaceReflectionPostProcess, ShaderLanguage, ShaderStore } from "babylonjs";

import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { Tools } from "../tools/tools";

import { Editor } from "../editor";

export interface IPostProcessAsset {
    /**
     * Defines the relative path to the post-process source code.
     */
    sourcePath: string;
    /**
     * Defines the reference to the post-process.
     */
    postProcess: PostProcess;
}

export interface ISerializedPostProcessAsset {
    /**
     * Defines the relative path to the post-process source code.
     */
    sourcePath: string;
    /**
     * Defines the reference to the JSON representation of the post-process.
     */
    serializationObject: any;
}

export class PostProcessAssets {
    /**
     * Returns wether or not the given post-process in a reserved one.
     * @param p defines the reference to the post-process to test.
     */
    public static IsReservedPostProcess(p: PostProcess): boolean {
        return p instanceof MotionBlurPostProcess || p instanceof ScreenSpaceReflectionPostProcess;
    }

    /**
     * Defines the list of all available post-processes.
     */
    public postProcesses: IPostProcessAsset[] = [];

    private _editor: Editor;
    private _watchers: IStringDictionary<FSWatcher> = {};

    /**
     * Constructor.
     * @param editor defines the reference to the editor.
     */
    public constructor(editor: Editor) {
        this._editor = editor;
    }

    /**
     * Adds the given post-process to the list of available custom post-processes in the project.
     * @param sourcePath defines the relative path to the source file of the post-process.
     * @param postProcess defines the reference to the created post-process.
     */
    public addPostProcess(sourcePath: string, postProcess: PostProcess): void {
        this.postProcesses.push({ sourcePath, postProcess });
    }

    /**
     * Resets all the processes related to the post-processes such as the watchers etc.
     */
    public reset(): void {
        for (const key in this._watchers) {
            this._watchers[key]?.close();
        }

        this._watchers = {};

        this.postProcesses.forEach((p) => {
            if (this._watchers[p.sourcePath]) {
                return;
            }

            try {
                const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, p.sourcePath);

                delete require.cache[jsPath];

                const exports = require(jsPath);
                const postProcessConfiguration = exports.postProcessConfiguration;

                if (!postProcessConfiguration) {
                    throw new Error("Post-process configuration is needed.");
                }

                const fragmentPath = join(dirname(join(WorkSpace.DirPath!, p.sourcePath)), postProcessConfiguration.pixelShaderContent);

                this._watchers[p.sourcePath] = watch([jsPath, fragmentPath], {
                    persistent: true,
                    ignoreInitial: false,
                    awaitWriteFinish: true,
                }).on("change", () => {
                    this._handlePostProcessChanged(p, fragmentPath);
                });
            } catch (e) {
                this._editor.console.logWarning(`Failed to watch post-process source code: ${p.sourcePath}: ${e.message}`);
            }
        });
    }

    /**
     * Called on the JS source file or the fragment source file changed.
     */
    private async _handlePostProcessChanged(asset: IPostProcessAsset, fragmentPath: string): Promise<void> {
        const serializationObject = asset.postProcess.serialize();
        const fragmentShaderName = asset.postProcess.getClassName();
        const shadersStoreKey = `${fragmentShaderName}FragmentShader`;

        // Remove from cache
        const compiledEffects = this._editor.engine!["_compiledEffects"];
        for (const key in compiledEffects) {
            if (key.indexOf(fragmentShaderName) !== -1) {
                compiledEffects[key].dispose();
                delete compiledEffects[key];
            }
        }

        // Misc.
        const fragmentShaderCode = await readFile(fragmentPath, { encoding: "utf-8" });

        Effect.ShadersStore[shadersStoreKey] = fragmentShaderCode;
        delete ShaderStore.GetShadersStore(ShaderLanguage.GLSL)[shadersStoreKey];

        const positions = this._editor.scene!.cameras.map((camera) => {
            const index = camera._postProcesses.indexOf(asset.postProcess);
            camera.detachPostProcess(asset.postProcess);

            return { index, camera };
        });

        // Remove from post-processes collection
        const index = this._editor.scene!.postProcesses.indexOf(asset.postProcess);
        if (index !== -1) {
            this._editor.scene!.postProcesses.splice(index, 1);
        }

        // Copy and rebuild post-process
        await SceneExporter.CopyShaderFiles(this._editor);

        const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, asset.sourcePath);

        delete require.cache[jsPath];
        const exports = require(jsPath);

        const postProcessConfiguration = exports.postProcessConfiguration;
        if (postProcessConfiguration) {
            const fxPath = join(dirname(jsPath), postProcessConfiguration.pixelShaderContent);
            delete require.cache[fxPath];
        }

        const pp = PostProcess.Parse(serializationObject, this._editor.scene!, join(this._editor.assetsBrowser.assetsDirectory, "/"));

        if (pp) {
            asset.postProcess = pp;

            positions.forEach((p) => {
                p.camera.attachPostProcess(pp, p.index === -1 ? undefined : p.index);
            });

            this._editor.inspector.refresh();
        }
    }

    /**
     * Serializes all the post-processes.
     */
    public serialize(): ISerializedPostProcessAsset[] {
        const result: ISerializedPostProcessAsset[] = [];

        this.postProcesses.forEach((p) => {
            const index = this._editor.scene!.postProcesses.indexOf(p.postProcess);
            if (index === -1) {
                return;
            }

            result.push({
                sourcePath: p.sourcePath,
                serializationObject: p.postProcess.serialize(),
            });
        });

        return result;
    }
}
