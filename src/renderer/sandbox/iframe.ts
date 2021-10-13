import { Nullable } from "../../shared/types";

/**
 * Defines the main sandbox class used in the iFrame.
 * @see ./main.ts for more informations.
 */
export class SandboxIFrame {
    /**
     * Binds the sandbox events.
     */
    public static BindEvents(): void {
        window.addEventListener("message", async (ev) => {
            if (!ev.data) { return; }
            
            const fn = ev.data.fn;
            const args = ev.data.args;
            const id = ev.data.id;

            if (!fn || !args || !id) { return; }

            try {
                const result = await this[fn].apply(this, args);
                parent.postMessage({ fn, id, result }, undefined!);
            } catch (e) {
                parent.postMessage({ fn, id, error: e.message }, undefined!);
            }
        });
    }

    /**
     * Returns the list of all constructors of the default class exported in the following TS file path.
     * @param path defines the path to the JS file.
     */
    public static GetConstructorsList(path: string): string[] {
        this.ClearCache(path);

        try {
            const result: string[] = [];
            const exports = require(path);

            if (!exports.default) { return []; }

            let prototype = exports.default.prototype;
            while (prototype) {
                result.push(prototype.constructor.name);
                prototype = Object.getPrototypeOf(prototype);
            }

            return result;
        } catch (e) {
            return [];
        }
    }

    /**
     * Requires the given file and returns all its decorator attributes.
     * @param path the path of the file to require.
     */
    public static GetInspectorValues(path: string): any {
        this.ClearCache(path);

        const exports = require(path);
        return exports?.default?._InspectorValues;
    }

    /**
     * Executes the given code in the sandbox context.
     * @param code the code to execute.
     * @param name the name of the module.
     */
    public static ExecuteCode(code: string, name: string): void {
        const Module = require("module");
        const module = new Module();
        module._compile(code, name);
    }

    /**
     * Clears the require cache.
     */
    public static ClearCache(path: Nullable<string> = null): void {
        if (path === null) {
            require.cache = { };
            return;
        }

        for (const c in require.cache) {
            const cachePath = c.replace(/\\/g, "/");
            if (cachePath.indexOf("node_modules") === -1) {
                delete require.cache[c];
            }
        }

        delete require.cache[path];
    }
}
