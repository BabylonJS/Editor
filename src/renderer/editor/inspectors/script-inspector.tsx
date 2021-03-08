import { shell } from "electron";
import { normalize, join, extname } from "path";
import { readFile, watch, FSWatcher, pathExists } from "fs-extra";
import { transpile, ModuleKind, ScriptTarget } from "typescript";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Spinner, Pre } from "@blueprintjs/core";

import { Node, Scene, Color3, Color4 } from "babylonjs";
import { GUI, GUIController } from "dat.gui";

import { WorkSpace } from "../project/workspace";

import { Tools } from "../tools/tools";
import { IAttachedScriptMetadata } from "../tools/types";

import { SandboxMain } from "../../sandbox/main";

import { Inspector } from "../components/inspector";
import { AbstractInspectorLegacy } from "./abstract-inspector-legacy";

import { ScriptAssets } from "../assets/scripts";
import { GraphAssets } from "../assets/graphs";
import { IAssetComponentItem } from "../assets/abstract-assets";

export class ScriptInspector<T extends Node | Scene> extends AbstractInspectorLegacy<T> {
    private _selectedScript: string = "";

    private _scriptFolder: Nullable<GUI> = null;
    private _scriptControllers: GUIController[] = [];
    private _scriptFolders: GUI[] = [];

    private _refreshingScripts: boolean = false;

    private _scriptWatcher: Nullable<FSWatcher> = null;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addScript();
    }

    /**
     * Called on the component will unmount.
     * @override
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        if (this._scriptWatcher) {
            this._scriptWatcher.close();
        }
    }

    /**
     * Adds the script editable properties.
     */
    protected async addScript(): Promise<void> {
        if (!WorkSpace.HasWorkspace()) { return; }

        this._scriptFolder ??= this.tool!.addFolder("Script");
        this._scriptFolder.open();

        // Check metadata
        this.selectedObject.metadata = this.selectedObject.metadata ?? { };
        this.selectedObject.metadata.script = this.selectedObject.metadata.script ?? { };

        // Add suggest
        this._selectedScript = this.selectedObject.metadata.script.name ?? "None";
        this._scriptFolder.addSuggest(this, "_selectedScript", ["None"], {
            onUpdate: async () => ["None"].concat(await ScriptAssets.GetAllScripts()),
        }).name("Script").onChange(() => {
            this._setScript(this._selectedScript);
        });

        // Serialized properties.
        if (this._selectedScript !== "None") {
            // Refresh
            this._scriptFolder.addButton("Refresh...").onClick(() => this._refreshScript(this._scriptFolder!));

            const tsPath = join(WorkSpace.DirPath!, this.selectedObject.metadata.script.name);

            this._scriptFolder.addButton("Open Script...").onClick(() => shell.openItem(tsPath));

            // Preview
            readFile(tsPath, { encoding: "utf-8" }).then((c) => {
                const preview = this._scriptFolder!.addFolder("Preview");
                preview.addCustom("500px", <Pre style={{ height: "500px" }}>{c}</Pre>);
            });

            // Properties
            const spinner = this._scriptFolder.addCustom("35px", <Spinner size={35} />);

            try {
                await this._updateScriptVisibleProperties(this._scriptFolder);
            } catch (e) {
                // TODO: manage errors.
            }

            this._scriptFolder.remove(spinner as any);
        } else {
            this._scriptFolder.addCustom("100px", (
                <div
                    style={{ width: "calc(100% - 2px)", height: "95px", borderColor: "black", borderStyle: "dashed" }}
                    onDragOver={(e) => e.currentTarget.style.borderColor = "#2FA1D6"}
                    onDragLeave={(e) => e.currentTarget.style.borderColor = "black"}
                    onDrop={async (e) => {
                        e.currentTarget.style.borderColor = "black";

                        try {
                            const data = JSON.parse(e.dataTransfer.getData("application/script-asset")) as IAssetComponentItem;
                            if (!data.extraData?.scriptPath) { throw new Error("Can't drag'n'drop script, extraData is misisng"); }
                            
                            this._setScript(data.extraData.scriptPath as string);
                        } catch (e) {
                            this.editor.console.logError("Failed to parse data of drag'n'drop event.");
                        }
                    }}
                >
                    <h3 style={{ textAlign: "center", pointerEvents: "none", lineHeight: "95px", color: "#eee" }}>
                        Drag'n'drop script here.
                    </h3>
                </div>
            ));
        }
    }

    /**
     * Sets the new script selected;
     */
    private _setScript(script: string): void {
        if (!this._scriptFolder) { return; }

        this.selectedObject.metadata.script.name = script;
        this.editor.graph.refresh();
        
        if (this._scriptWatcher) {
            this._scriptWatcher.close();
            this._scriptWatcher = null;
        }

        // Refresh assets
        this.editor.assets.refresh(ScriptAssets);
        this.editor.assets.refresh(GraphAssets);

        this._scriptControllers = [];
        this._scriptFolders = [];

        this.clearFolder(this._scriptFolder);
        this.addScript();
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

        if (!this._scriptWatcher) {
            while (this.isMounted && !(await pathExists(jsPath))) {
                await Tools.Wait(500);
            }

            if (!this.isMounted) { return; }

            this._scriptWatcher = watch(jsPath, { encoding: "utf-8" }, (ev) => {
                if (ev === "change") {
                    this._refreshScript(folder);
                }
            });
        }

        const inspectorValues = await SandboxMain.GetInspectorValues(jsPath) ?? [];

        // Manage properties
        const script = this.selectedObject.metadata.script as IAttachedScriptMetadata;
        script.properties = script.properties ?? { };

        const computedValues: string[] = [];
        inspectorValues.forEach((v) => {
            script.properties![v.propertyKey] = script.properties![v.propertyKey] ?? { type: v.type };

            const defaultValue = v.defaultValue;
            switch (v.type) {
                case "number": script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? defaultValue ?? 0; break;
                case "string": script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? defaultValue ?? ""; break;
                case "boolean": script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? defaultValue ?? false; break;
                case "KeyMap": script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? defaultValue ?? 0; break;

                case "Vector2":
                    var { x, y } = defaultValue;
                    script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? (defaultValue ? { x, y } : null) ?? { x: 0, y: 0 };
                    break;
                case "Vector3":
                    var { _x, _y, _z } = defaultValue;
                    script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? (defaultValue ? { x: _x, y: _y, z: _z } : null) ?? { x: 0, y: 0, z: 0 };
                    break;
                case "Vector4":
                    var { x, y, z, w } = defaultValue;
                    script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? (defaultValue ? { x, y, z, w } : null) ?? { x: 0, y: 0, z: 0, w: 0 };
                    break;

                case "Color3":
                    var { r, g, b } = defaultValue;
                    script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? (defaultValue ? { r, g, b } : null) ?? { r: 0, g: 0, b: 0 };
                    break;
                case "Color4":
                    var { r, g, b, a } = defaultValue;
                    script.properties![v.propertyKey].value = script.properties![v.propertyKey].value ?? (defaultValue ? { r, g, b, a } : null) ?? { r: 0, g: 0, b: 0, a: 1 };
                    break;
            }

            computedValues.push(v.propertyKey);
        });

        // Clean properties
        for (const key in script.properties) {
            if (computedValues.indexOf(key) === -1) { delete script.properties[key]; }
        }

        this._clearScriptControllersAndFolders(folder);

        // Add all editable values
        inspectorValues.forEach((v) => {
            let controller: Nullable<any> = null;
            let color: Nullable<any> = null;

            const property = script.properties![v.propertyKey];
            const value = property.value as any;

            switch (v.type) {
                case "number":
                case "string":
                case "boolean":
                    controller = folder.add(property, "value").name(v.name);
                    break;

                case "KeyMap":
                    controller = folder.addKeyMapper(property, "value").name(v.name);
                    break;

                case "Vector2":
                case "Vector3":
                case "Vector4":
                    controller = folder.addVector(v.name, value);
                    break;

                case "Color3":
                    const color3 = new Color3(value.r, value.g, value.b);
                    color = this.addColor(folder, v.name, { value: color3 }, "value", (c: Color3) => {
                        value.r = c.r;
                        value.g = c.g;
                        value.b = c.b;
                    });
                    break;
                case "Color4":
                    const color4 = new Color4(value.r, value.g, value.b, value.a);
                    color = this.addColor(folder, v.name, { value: color4 }, "value", (c: Color4) => {
                        value.r = c.r;
                        value.g = c.g;
                        value.b = c.b;
                        value.a = c.a;
                    });
                    break;
            }

            if (controller) { this._scriptControllers.push(controller); }
            if (color) { this._scriptFolders.push(color); }
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

    /**
     * Clears all controllers and folders for script.
     */
    private _clearScriptControllersAndFolders(folder: GUI): void {
        this._scriptControllers.forEach((sc) => {
            try { folder.remove(sc); } catch (e) { /* Catch silently */ }
        });

        this._scriptFolders.forEach((f) => {
            try { folder.removeFolder(f); } catch (e) { /* Catch silently */ }
        });

        this._scriptControllers = [];
        this._scriptFolders = [];
    }
}

Inspector.RegisterObjectInspector({
    ctor: ScriptInspector,
    ctorNames: ["Node"],
    title: "Node",
});
