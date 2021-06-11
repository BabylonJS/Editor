import * as GeneratorCore from "generator-core/lib/generator";
import * as GeneratorLogging from "generator-core/lib/logging";
import * as GeneratorConfig from "generator-core/lib/config";

import { join } from "path";

import { Nullable } from "../../../shared/types";
import { Document } from "../../../../photoshop-extension/src/document";

import { DynamicTexture } from "babylonjs";

import { Editor } from "../editor";
import { TextureAssets } from "../assets/textures";

export class PhotoshopExtension {
    private static _GeneratorProcess: Nullable<any> = null;
    private static _PluginName: string = "babylonjs-editor-photoshop-extension";
    private static _Document: Nullable<Document> = null;
    private static _Syncing: boolean = false;

    private static _Textures: DynamicTexture[] = [];

    /**
     * Inits the Photoshop extension.
     */
    public static async Init(editor: Editor, password: string): Promise<void> {
        // Create task
        const task = editor.addTaskFeedback(0, "Connecting to Photoshop");

        // Create generator
        const loggerManager = new GeneratorLogging.LoggerManager(GeneratorLogging.LOG_LEVEL_INFO);
        this._GeneratorProcess = GeneratorCore.createGenerator(loggerManager);

        const extensionPath = join(__dirname, "../../../../../", "photoshop-extension");
        editor.updateTaskFeedback(task, 50);

        try {
            await new Promise<void>(async (resolve, reject) => {
                // _GeneratorProcess
                this._GeneratorProcess.on("close", () => reject());

                // Resolve
                await this._GeneratorProcess.start({
                    password,
                    config: GeneratorConfig.getConfig(),
                });
                resolve();
            });

            this._GeneratorProcess.loadPlugin(extensionPath);
            this._Document = this._GeneratorProcess.getPlugin(this._PluginName)?.document;
            this._BindEvents(editor);
            this._Sync();

            editor.updateTaskFeedback(task, 100);
            editor.closeTaskFeedback(task, 1000);
        } catch (e) {
            editor.closeTaskFeedback(task);
            editor.notifyMessage("Can't connect to Photoshop Generator", 1000, "error");
        }
    }

    /**
     * Closes the Photoshop extension.
     */
    public static Close(): void {
        this._GeneratorProcess?.shutdown();
        this._GeneratorProcess = null;

        this._Document = null;
        this._Syncing = false;
    }

    /**
     * Returns wether or not the plugin is enabled.
     */
    public static get IsEnabled(): boolean {
        return this._Document !== null;
    }

    /**
     * Toggles wether or not the photoshop extension is enabled.
     * @param editor the editor reference.
     * @param password defines the password used to connect to photoshop.
     */
    public static async ToggleEnabled(editor: Editor, password: string): Promise<void> {
        if (this.IsEnabled) {
            return this.Close();
        }

        return this.Init(editor, password);
    }

    /**
     * Binds the events.
     */
    private static _BindEvents(editor: Editor): void {
        if (!this._Document) { return; }

        this._Document.onDocumentChangedObservable.add((d) => {
            let texture = this._Textures.find((t) => t.name === d.name) ?? null;
            if (texture) {
                const size = texture.getSize();
                if (size.width !== d.width || size.height !== d.height) {
                    const index = this._Textures.indexOf(texture);
                    if (index !== -1) { this._Textures.splice(index, 1); }

                    texture.dispose();
                    texture = null;
                }
            }

            // Create texture?
            if (!texture) {
                texture = new DynamicTexture(d.name, { width: d.width, height: d.height }, editor.scene, false);
                texture.metadata = {
                    photoshop: true,
                    photoshopName: d.name,
                };
                this._Textures.push(texture);
            }

            // Update texture
            const ctx = texture.getContext();
            ctx.putImageData(new ImageData(new Uint8ClampedArray(d.pixels), d.width, d.height), 0, 0);
            texture.update(true);

            editor.assets.refresh(TextureAssets, texture);
            editor.console.logInfo(`Successfully updated texture "${texture.name}" from Photoshop`);
        });
    }

    /**
     * Syncs Photoshop and the editor.
     */
    private static async _Sync(): Promise<void> {
        if (!this._Document || this._Syncing) { return; }

        this._Syncing = true;
        await this._Document.sync();
        this._Syncing = false;
    }
}
