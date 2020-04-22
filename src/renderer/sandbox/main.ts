import { Nullable } from "../../shared/types";

import { Tools } from "../editor/tools/tools";

/**
 * Defines the main sandbox class used in the editor's renderer process.
 */
export class SandboxMain {
    private static _IFrame: HTMLIFrameElement;

    /**
     * Inits the sandbox.
     */
    public static async Init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._IFrame = document.createElement("iframe");
            this._IFrame.addEventListener("load", () => resolve());
            this._IFrame.addEventListener("error", (e) => reject(e));
            this._IFrame.style.visibility = "hidden";
            this._IFrame.src = "./html/sandbox.html";
            document.body.append(this._IFrame);
        });
    }

    /**
     * Clears the require cache.
     */
    public static ClearCache(path: Nullable<string> = null): Promise<void> {
        return this._CallFunction("ClearCache", path);
    }

    /**
     * Requires the given file and returns all its decorator attributes.
     * @param path the path of the file to require.
     */
    public static GetInspectorValues(path: string): Promise<any> {
        return this._CallFunction("GetInspectorValues", path);
    }

    /**
     * Executes the given code in the sandbox context.
     * @param code the code to execute.
     * @param name the name of the module.
     */
    public static ExecuteCode(code: string, name: string): Promise<void> {
        return this._CallFunction("ExecuteCode", code, name);
    }

    /**
     * Calls the given function with the given arguments in the iFrame.
     */
    private static async _CallFunction<T>(fn: string, ...args: any[]): Promise<T> {
        const id = Tools.RandomId();

        return new Promise<T>((resolve, reject) => {
            let callback: (ev: WindowEventMap["message"]) => any;
            window.addEventListener("message", callback = (ev) => {
                const data = ev.data;
                if (data.fn === fn && data.id === id) {
                    window.removeEventListener("message", callback);
                    if (data.error) {
                        reject(data.error);
                    } else {
                        resolve(data.result as T);
                    }
                }
            });
            this._IFrame.contentWindow?.postMessage({ fn, args, id }, undefined!);
        });
    }
}