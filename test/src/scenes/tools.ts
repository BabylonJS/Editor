import { Scene, Node } from "@babylonjs/core";

export type ScriptMap = {
    [index: string]: {
        default: (new (...args: any[]) => Node);
    }
};

/**
 * Requires the nedded scripts for the given nodes array and attach them.
 * @param nodes the array of nodes to attach script (if exists).
 */
function requireScriptForNodes(scriptsMap: ScriptMap, nodes: Node[]): void {
    for (const n of nodes) {
        if (!n.metadata || !n.metadata.script || !n.metadata.script.name || n.metadata.script.name === "None") { continue; }

        const exports = scriptsMap[n.metadata.script.name];
        if (!exports) { continue; }

        // Add prototype.
        const prototype = exports.default.prototype;
        for (const key in prototype) {
            if (!prototype.hasOwnProperty(key) || key === "constructor") { continue; }
            n[key] = prototype[key].bind(n);
        }

        // Check update
        if (exports.default.prototype.onUpdate) {
            n.getScene().onBeforeRenderObservable.add(() => n["onUpdate"]());
        }

        // Check start
        if (exports.default.prototype.onStart) {
            n.getScene().onBeforeRenderObservable.addOnce(() => n["onStart"]());
        }
    }
}

/**
 * Attaches all available scripts on nodes of the given scene.
 * @param scene the scene reference that contains the nodes to attach scripts.
 */
export function attachScripts(scriptsMap: ScriptMap, scene: Scene): void {
    requireScriptForNodes(scriptsMap, scene.meshes);
    requireScriptForNodes(scriptsMap, scene.lights);
    requireScriptForNodes(scriptsMap, scene.cameras);
    requireScriptForNodes(scriptsMap, scene.transformNodes);
}
