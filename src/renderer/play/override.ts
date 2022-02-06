import { join } from "path";
import { pathExistsSync } from "fs-extra";

import { Nullable } from "../../shared/types";

import { Engine, Tools } from "babylonjs";

export class PlayOverride {
    /** @hidden */
    public static _LoadFileFn: Nullable<typeof Tools.LoadFile> = null;
    /** @hidden */
    public static _CreateTextureFn: Nullable<typeof Engine.prototype.createTexture> = null;

    /**
     * Overrides the create texture function of the engine to ensure textures will be loaded
     * same in web browser and in editor.
     * @param workspacePath defines the absolute path of the workspace.
     */
    public static OverrideEngineFunctions(workspacePath: string): void {
        // Load file
        this._LoadFileFn = Tools.LoadFile;
        Tools.LoadFile = function (...args: any[]) {
            const pathInWorkspace = join(workspacePath, args[0]);
            if (pathExistsSync(pathInWorkspace)) {
                args[0] = `file:///${pathInWorkspace}`;
            }

            return PlayOverride._LoadFileFn!.call(this, ...args);
        };

        // Create texture
        this._CreateTextureFn = Engine.prototype.createTexture;
        Engine.prototype.createTexture = function (...args: any[]) {
            const url = args[0];
            if (url) {
                const pathInWorkspace = join(workspacePath, url);
                if (pathExistsSync(pathInWorkspace)) {
                    args[0] = `file:///${pathInWorkspace}`;
                }
            }

            return PlayOverride._CreateTextureFn!.call(this, ...args);
        };
    }

    /**
     * Restores all the original functions that were overidden.
     */
    public static RestoreOverridenFunctions(): void {
        if (this._LoadFileFn) {
            Tools.LoadFile = this._LoadFileFn;
        }

        if (this._CreateTextureFn) {
            Engine.prototype.createTexture = this._CreateTextureFn;
        }

        this._LoadFileFn = null;
        this._CreateTextureFn = null;
    }
}
