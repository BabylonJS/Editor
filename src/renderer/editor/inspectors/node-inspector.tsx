import { normalize, join } from "path";
import { readFile } from "fs-extra";
import { transpile, ModuleKind, ScriptTarget } from "typescript";

import { Nullable } from "../../../shared/types";

import { Node } from "babylonjs";
import { GUI, GUIController } from "dat.gui";

import { WorkSpace } from "../project/workspace";

import { Tools } from "../tools/tools";

import { Inspector } from "../components/inspector";
import { AbstractInspector } from "./abstract-inspector";

import { ScriptAssets } from "../assets/scripts";

export class NodeInspector extends AbstractInspector<Node> {
    private _selectedScript: string = "";
    private _scriptControllers: GUIController[] = [];

    private _refreshingScripts: boolean = false;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
        this.addScript();
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): GUI {
        const common = this.tool!.addFolder("Common");
        common.open();
        common.add(this.selectedObject, 'name').name('Name');

        return common;
    }

    /**
     * Adds the script editable properties.
     */
    protected async addScript(): Promise<void> {
        if (!WorkSpace.HasWorkspace()) { return; }

        const script = this.tool!.addFolder("Script");
        script.open();

        // Get all available scripts
        const allScripts = await ScriptAssets.GetAllScripts();

        // Check metadata
        this.selectedObject.metadata = this.selectedObject.metadata ?? { };
        this.selectedObject.metadata.script = this.selectedObject.metadata.script ?? { };

        // Add suggest
        this._selectedScript = this.selectedObject.metadata.script.name ?? "None";
        script.addSuggest(this, "_selectedScript", ["None"].concat(allScripts)).name("Script").onChange(() => {
            this.selectedObject.metadata.script.name = this._selectedScript;
            if (this._selectedScript === "None") {
                return;
            }

            this._updateScriptVisibleProperties(script);
        });

        // Refresh
        const refresh = { fn: async () => {
            if (this._refreshingScripts) { return; }
            this._refreshingScripts = true;
            await this._updateScriptVisibleProperties(script);
            this._refreshingScripts = false;
        } };

        script.add(refresh, "fn").name("Refresh...");

        // Serialized properties.
        if (this._selectedScript !== "None") {
            await this._updateScriptVisibleProperties(script);
        }
    }

    /**
     * Updates the attached script.
     */
    private async _updateScriptVisibleProperties(folder: GUI): Promise<void> {
        await this._refreshDecorators();

        const name = this.selectedObject.metadata.script.name;
        const path = normalize(join(WorkSpace.DirPath!, name));
        const content = await readFile(path, { encoding: "utf-8" });

        const transpiledScript = transpile(content, { module: ModuleKind.None, target: ScriptTarget.ES5, experimentalDecorators: true });

        const Module = require("module");

        let module: any;
        try {
            module = new Module();
            module._compile(transpiledScript, name);
        } catch (e) {
            return this.editor.console.logError(`Failed to parse script "${name}":\n${e.message}`);
        }

        if (!module.exports || !module.exports.default || !module.exports.default._InspectorValues) { return; }

        // Manage properties
        const script = this.selectedObject.metadata.script;
        script.properties = script.properties ?? { };

        const values = module.exports.default._InspectorValues;
        const computedValues: string[] = [];
        values.forEach((v) => {
            script.properties[v.propertyKey] = script.properties[v.propertyKey] ?? { type: v.type };

            switch (v.type) {
                case "number": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? 0; break;
                case "string": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? ""; break;
                case "boolean": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? false; break;
            }

            computedValues.push(v.propertyKey);
        });

        // Clean properties
        for (const key in script.properties) {
            if (computedValues.indexOf(key) === -1) { delete script.properties[key]; }
        }

        this._scriptControllers.forEach((sc) => {
            folder.remove(sc);
        });
        this._scriptControllers = [];

        // Add 
        values.forEach((v) => {
            let controller: Nullable<GUIController> = null;
            switch (v.type) {
                case "number":
                case "string":
                case "boolean":
                    controller = folder.add(script.properties[v.propertyKey], "value").name(v.name);
                    break;
            }

            if (controller) { this._scriptControllers.push(controller); }
        });
    }

    /**
     * Refreshes the decorators functions that are used in the project.
     */
    private async _refreshDecorators(): Promise<void> {
        const decorators = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "decorators.ts"), { encoding: "utf-8" });
        const transpiledScript = transpile(decorators, { module: ModuleKind.None, target: ScriptTarget.ES5, experimentalDecorators: true });

        const Module = require("module");

        const module = new Module();
        module._compile(transpiledScript, name);
    }
}

Inspector.registerObjectInspector({
    ctor: NodeInspector,
    ctorNames: ["Node"],
    title: "Node",
});
