import { join } from "path";
import { pathExistsSync } from "fs-extra";

import { Nullable } from "../../shared/types";

import { Engine } from "babylonjs";

export class PlayOverride {
    /**
     * @hidden
     */
    public static _CreateTextureFn: Nullable<typeof Engine.prototype.createTexture> = null;

    /**
     * Overrides the create texture function of the engine to ensure textures will be loaded
     * same in web browser and in editor.
     * @param workspacePath defines the absolute path of the workspace.
     */
    public static OverrideEngineFunctions(workspacePath: string): void {
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
        if (this._CreateTextureFn) {
            Engine.prototype.createTexture = this._CreateTextureFn;
        }

        this._CreateTextureFn = null;
    }
}
