import { shell } from "electron";
import { normalize, join, extname } from "path";
import { readFile } from "fs-extra";
import { transpile, ModuleKind, ScriptTarget } from "typescript";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Spinner, Pre } from "@blueprintjs/core";

import { Node } from "babylonjs";
import { GUI, GUIController } from "dat.gui";

import { WorkSpace } from "../project/workspace";

import { Tools } from "../tools/tools";
import { SandboxMain } from "../../sandbox/main";

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
        const allScripts = (await ScriptAssets.GetAllScripts()).filter((s) => s.indexOf("src/scenes/scene/graphs/") === -1);

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
        script.addButton("Refresh...").onClick(() => this._refreshScript(script));

        // Serialized properties.
        if (this._selectedScript !== "None") {
            const tsPath = join(WorkSpace.DirPath!, this.selectedObject.metadata.script.name);

            script.addButton("Open Script...").onClick(() => shell.openItem(tsPath));

            // Preview
            readFile(tsPath, { encoding: "utf-8" }).then((c) => {
                const preview = script.addFolder("Preview");
                preview.addCustom("500px", <Pre style={{ height: "500px" }}>{c}</Pre>);
            });

            // Properties
            const spinner = script.addCustom("35px", <Spinner size={35} />);

            try {
                await this._updateScriptVisibleProperties(script);
            } catch (e) {
                // TODO: manage errors.
            }

            script.remove(spinner as any);
        }
    }

    /**
     * Refreshes the script.
     */
    private async _refreshScript(folder: GUI): Promise<void> {
        if (this._refreshingScripts) { return; }
        this._refreshingScripts = true;
        await this._updateScriptVisibleProperties(folder);
        this._refreshingScripts = false;
    }

    /**
     * Updates the attached script.
     */
    private async _updateScriptVisibleProperties(folder: GUI): Promise<void> {
        await this._refreshDecorators();

        const name = this.selectedObject.metadata.script.name as string;
        const extension = extname(name);
        const extensionIndex = name.lastIndexOf(extension);

        if (extensionIndex === -1) { return; }

        const jsName = normalize(`${name.substr(0, extensionIndex)}.js`);
        const jsPath = join(WorkSpace.DirPath!, "build", jsName);

        const inspectorValues = await SandboxMain.GetInspectorValues(jsPath);
        if (!inspectorValues) { return; }

        // Manage properties
        const script = this.selectedObject.metadata.script;
        script.properties = script.properties ?? { };

        const computedValues: string[] = [];
        inspectorValues.forEach((v) => {
            script.properties[v.propertyKey] = script.properties[v.propertyKey] ?? { type: v.type };

            const defaultValue = v.defaultValue;
            switch (v.type) {
                case "number": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? defaultValue ?? 0; break;
                case "string": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? defaultValue ?? ""; break;
                case "boolean": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? defaultValue ?? false; break;
                case "KeyMap": script.properties[v.propertyKey].value = script.properties[v.propertyKey].value ?? defaultValue ?? 0; break;
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

        // Add all editable values
        inspectorValues.forEach((v) => {
            let controller: Nullable<any> = null;
            switch (v.type) {
                case "number":
                case "string":
                case "boolean":
                    controller = folder.add(script.properties[v.propertyKey], "value").name(v.name);
                    break;
                case "KeyMap":
                    controller = folder.addKeyMapper(script.properties[v.propertyKey], "value").name(v.name);
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

       await SandboxMain.ExecuteCode(transpiledScript, "__editor__decorators__.js");
    }
}

Inspector.registerObjectInspector({
    ctor: NodeInspector,
    ctorNames: ["Node"],
    title: "Node",
});
