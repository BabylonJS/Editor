import { Nullable } from "../../shared/types";

import { Vector2, Vector3, Vector4, Color3, Color4 } from "babylonjs"

import SandboxWorker from "../editor/workers/workers/sandbox";
import { IWorkerConfiguration, Workers } from "../editor/workers/workers";

export interface IExportedInspectorValueOptions {
    /**
     * Defines the section of the inspector.
     */
    section?: string;

    /**
     * In case of numbers, defines the minimum value.
     */
    min?: number;
    /**
     * In case of numbers, defines the maximum value.
     */
    max?: number;
    /**
     * In case of numbers, defines the step applied in the editor.
     */
    step?: number;
}

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
    defaultValue: number | string | boolean | Vector2 | Vector3 | Vector4 | Color3 | Color4;
    /**
     * Defines the type of the decorated property.
     */
    type: "number" | "string" | "boolean" | "KeyMap" | "Vector2" | "Vector3" | "Vector4" | "Color3" | "Color4" | "Texture";

    /**
     * Defines the optional options available for the exported value.
     */
    options?: IExportedInspectorValueOptions;
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
    private static _Worker: IWorkerConfiguration;

    /**
     * Inits the sandbox.
     */
    public static async Init(): Promise<void> {
        this._Worker = await Workers.LoadWorker("sandbox.js");
    }

    /**
     * Clears the require cache.
     */
    public static ClearCache(path: Nullable<string> = null): Promise<void> {
        if (path) {
            for (const c in require.cache) {
                const cachePath = c.replace(/\\/g, "/");
                if (cachePath.indexOf("node_modules") === -1) {
                    delete require.cache[c];
                }
            }

            delete require.cache[path];
        }

        return Workers.ExecuteFunction<SandboxWorker, "clearCache">(this._Worker, "clearCache", path);
    }

    /**
     * Requires the given file and returns all its decorator attributes.
     * @param path the path of the file to require.
     */
    public static GetInspectorValues(path: string): Promise<IExportedInspectorValue[]> {
        return Workers.ExecuteFunction<SandboxWorker, "getInspectorValues">(this._Worker, "getInspectorValues", path);
    }

    /**
     * Executes the given code in the sandbox context.
     * @param code the code to execute.
     * @param name the name of the module.
     */
    public static ExecuteCode(code: string, name: string): Promise<void> {
        return Workers.ExecuteFunction<SandboxWorker, "executeCode">(this._Worker, "executeCode", code, name);
    }

    /**
     * Returns the list of all constructors of the default class exported in the following TS file path.
     * @param path defines the path to the JS file.
     */
    public static GetConstructorsList(path: string): Promise<string[]> {
        return Workers.ExecuteFunction<SandboxWorker, "getConstructorsList">(this._Worker, "getConstructorsList", path);
    }
}