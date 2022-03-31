import { join } from "path";
import { pathExistsSync } from "fs-extra";

import { Nullable } from "../../shared/types";

import { Engine, WebRequest } from "babylonjs";

export class PlayOverride {
    /** @hidden */
    public static _WebRequestOpen: Nullable<typeof WebRequest.prototype.open> = null;
    /** @hidden */
    public static _CreateTextureFn: Nullable<typeof Engine.prototype.createTexture> = null;

    /**
     * Overrides the create texture, load file, etc. functions of the engine to ensure textures
     * will be loaded same way in web browser and in editor.
     * @param workspacePath defines the absolute path of the workspace.
     */
    public static OverrideEngineFunctions(workspacePath: string): void {
        // Load file
        this._WebRequestOpen = WebRequest.prototype.open;
        this._CreateTextureFn = Engine.prototype.createTexture;

        WebRequest.prototype.open = this._GetOverridedFunctionUrl(this._WebRequestOpen, workspacePath, 1);
        Engine.prototype.createTexture = this._GetOverridedFunctionUrl(this._CreateTextureFn, workspacePath, 0);
    }

    /**
     * Restores all the original functions that were overidden.
     */
    public static RestoreOverridenFunctions(): void {
        if (this._WebRequestOpen) {
            WebRequest.prototype.open = this._WebRequestOpen;
        }

        if (this._CreateTextureFn) {
            Engine.prototype.createTexture = this._CreateTextureFn;
        }

        this._WebRequestOpen = null;
        this._CreateTextureFn = null;
    }

    /**
     * Returns the reference to the function
     */
    private static _GetOverridedFunctionUrl(fn: (...args: any[]) => any, workspacePath: string, argumentIndex: number): (...args: any[]) => any {
        return function (...args: any[]) {
            const url = args[argumentIndex];
            if (url) {
                const pathInWorkspace = join(workspacePath, url);
                if (pathExistsSync(pathInWorkspace)) {
                    args[argumentIndex] = join("file:/", pathInWorkspace);
                }
            }

            return fn.call(this, ...args);
        };
    }
}
