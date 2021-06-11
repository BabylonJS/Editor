import { Nullable } from "../../shared/types";

import { Vector2, Vector3, Vector4, Color3, Color4 } from "babylonjs"

import { Tools } from "../editor/tools/tools";

export interface IExportedInspectorValue {
    /**
     * Defines the key in the class that has been decorated by @fromEditor.
     */
    propertyKey: string;
    /**
     * Defines the name of the property in the editor's inspector.
     */
    name: string;
    /**
     * Defines the default value of the decorated property.
     */
    defaultValue: number | string | boolean | Vector2 | Vector3 | Vector4 | Color3 | Color4;
    /**
     * Defines the type of the decorated property.
     */
    type: "number" | "string" | "boolean" | "KeyMap" | "Vector2" | "Vector3" | "Vector4" | "Color3" | "Color4";
}

/**
 * Defines the main sandbox class used in the editor's renderer process.
 * Nodes in the scene can have scripts attached to them. A script can decorate properties (numbers, strings, vectors, etc.) using
 * decorators. In these decorators, the "@visibleInInspector" decorator is used to be able to customize the members directly in the editor.
 * As decorators are executed in runtime, we need to require/import the script attached to the node being modified in the scene.
 * To avoid having user scripts running in the same process as the editor, we use an iframe that will require/import these scripts and return
 * the desired objects.
 * 
 * Example script:
 *  import { Mesh } from "@babylonjs/core";
 * 
 *  // Import a lib that is not used by the editor.
 *  import { io } from "socket.io";
 * 
 *  // Import decorators
 *  import { visibleInInspector } from "../tools";
 * 
 *  export default class MyScript extends Mesh {
 *      @visibleInInspector("number", "Speed")
 *      public speed: number = null;
 * 
 *      ...
 * }
 * 
 * This script will be imported using "require("./myScript.js");"
 * Then, the decorators will be executed and will put the needed data in the MyScript class object.
 * 
 * The only thing the iFrame has do do now, is to return the exported object of the require. Typically exports.default._InspectorValues.
 * 
 * @see ./iframe.ts for more informations about require/import of scripts and returned values.
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
            this._IFrame.src = "../html/sandbox.html";
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
    public static GetInspectorValues(path: string): Promise<IExportedInspectorValue[]> {
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