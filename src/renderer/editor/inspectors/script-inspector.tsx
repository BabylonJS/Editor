import { shell } from "electron";
import { normalize, join, extname } from "path";
import { readFile, watch, FSWatcher, pathExists } from "fs-extra";
import { transpile, ModuleKind, ScriptTarget } from "typescript";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Spinner } from "@blueprintjs/core";

import { Scene, Node, Vector2, Vector3, Color4 } from "babylonjs";

import { IObjectInspectorProps } from "../components/inspector";

import { InspectorColor } from "../gui/inspector/fields/color";
import { InspectorNumber } from "../gui/inspector/fields/number";
import { InspectorButton } from "../gui/inspector/fields/button";
import { InspectorString } from "../gui/inspector/fields/string";
import { InspectorBoolean } from "../gui/inspector/fields/boolean";
import { InspectorSection } from "../gui/inspector/fields/section";
import { InspectorVector3 } from "../gui/inspector/fields/vector3";
import { InspectorVector2 } from "../gui/inspector/fields/vector2";
import { InspectorKeyMapButton } from "../gui/inspector/fields/keymap-button";
import { InspectorList, IInspectorListItem } from "../gui/inspector/fields/list";

import { WorkSpace } from "../project/workspace";

import { Tools } from "../tools/tools";

import { SandboxMain, IExportedInspectorValue } from "../../sandbox/main";

import { IAssetComponentItem } from "../assets/abstract-assets";

import { AbstractInspector } from "./abstract-inspector";

export interface IScriptInspectorState {
    /**
     * Defines wether or not the script is being refreshing.
     */
    refresing: boolean;
    /**
     * Defines the list of all available sripts.
     */
    scripts: string[];
    /**
     * Defines the list of all decorated inspector values.
     */
    inspectorValues: IExportedInspectorValue[];
}

export class ScriptInspector<T extends (Scene | Node), S extends IScriptInspectorState> extends AbstractInspector<T, S> {
    private _scriptWatcher: Nullable<FSWatcher> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IObjectInspectorProps) {
        super(props);

        this.state = {
            ...this.state,
            scripts: [],
            refresing: false,
            inspectorValues: [],
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        // Check metadata
        this.selectedObject.metadata ??= { };
        this.selectedObject.metadata.script ??= { };
        this.selectedObject.metadata.script.name ??= "None";

        // Check workspace
        if (!WorkSpace.HasWorkspace()) { return null; }
        
        return (
            <InspectorSection title="Script">
                {this._getDragAndDropZone()}
                {this._getScriptsList()}
                {this._getOpenButton()}
                {this._getSpinner()}
                {this._getInspectorValues()}
            </InspectorSection>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount?.();

        this.refreshAvailableScripts();
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount?.();

        if (this._scriptWatcher) {
            this._scriptWatcher.close();
            this._scriptWatcher = null;
        }
    }

    /**
     * Returns the list of available items for the list.
     */
    protected getScriptsListItems(): IInspectorListItem<string>[] {
        return [{ label: "None", data: "None" }].concat(this.state.scripts.map((s) => ({
            label: s,
            data: s,
            icon: <img src="../css/images/ts.png" style={{ width: "24px", height: "24px" }}></img>,
        })));
    }

    /**
     * Refreshes the list of all available scripts.
     */
    protected async refreshAvailableScripts(): Promise<void> {
        const scripts = await this.editor.assetsBrowser.getAllScripts();

        this.setState({ scripts });
        this._updateScriptVisibleProperties();
    }

    /**
     * In case of existing scripts, it returns the list of all avaiable scripts to be attached.
     */
    private _getScriptsList(): React.ReactNode {
        return (
            <InspectorList
                label="Path"
                property="name"
                dndHandledTypes={["asset/typescript"]}
                object={this.selectedObject.metadata.script}
                items={async () => {
                    await this.refreshAvailableScripts();
                    return this.getScriptsListItems();
                }}
                onChange={() => this._updateScriptVisibleProperties()}
            />
        )
    }

    /**
     * In case of no script, draws a zone that supports drag'n'drop for scripts.
     */
    private _getDragAndDropZone(): React.ReactNode {
        if (this.selectedObject.metadata.script.name !== "None") {
            return undefined;
        }

        return (
            <div
                style={{ width: "100%", height: "50px", border: "1px dashed black" }}
                onDragEnter={(e) => (e.currentTarget as HTMLDivElement).style.border = "dashed red 1px"}
                onDragLeave={(e) => (e.currentTarget as HTMLDivElement).style.border = "dashed black 1px"}
                onDrop={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "dashed black 1px";

                    try {
                        const data = JSON.parse(e.dataTransfer.getData("application/script-asset")) as IAssetComponentItem;
                        if (!data.extraData?.scriptPath) { throw new Error("Can't drag'n'drop script, extraData is misisng"); }
                        
                        this.selectedObject.metadata.script.name = data.extraData.scriptPath;
                        this._updateScriptVisibleProperties();
                    } catch (e) {
                        this.editor.console.logError("Failed to parse data of drag'n'drop event.");
                    }
                }}
            >
                <h2 style={{ textAlign: "center", color: "white", lineHeight: "50px", userSelect: "none" }}>Drag'n'drop script here.</h2>
            </div>
        );
    }

    /**
     * In case of a script set, it returns the button component to open the script.
     */
    private _getOpenButton(): React.ReactNode {
        if (this.selectedObject.metadata.script.name === "None") {
            return undefined;
        }

        const tsPath = join(WorkSpace.DirPath!, this.selectedObject.metadata.script.name);
        return <InspectorButton label="Open..." onClick={() => shell.openItem(tsPath)} />
    }

    /**
     * Returns the spinner shown in case of refreshing.
     */
    private _getSpinner(): React.ReactNode {
        if (!this.state.refresing) {
            return undefined;
        }

        return <Spinner size={35} />;
    }

    /**
     * Returns the list of all exported values.
     */
    private _getInspectorValues(): React.ReactNode {
        if (this.selectedObject.metadata.script.name === "None" || !this.state.inspectorValues.length) {
            return undefined;
        }

        this.selectedObject.metadata.script.properties ??= { };

        const children: React.ReactNode[] = [];
        const properties = this.selectedObject.metadata.script.properties;

        this.state.inspectorValues.forEach((iv) => {
            properties[iv.propertyKey] ??= { type: iv.type };

            const label = iv.name ?? iv.propertyKey;
            const property = properties[iv.propertyKey];

            switch (iv.type) {
                case "number":
                    property.value ??= property.value ?? iv.defaultValue ?? 0;
                    children.push(
                        <InspectorNumber object={property} property="value" label={label} step={0.01} />
                    );
                    break;

                case "string":
                    property.value ??= property.value ?? iv.defaultValue ?? "";
                    children.push(
                        <InspectorString object={property} property="value" label={label} />
                    );
                    break;

                case "boolean":
                    property.value ??= property.value ?? iv.defaultValue ?? false;
                    children.push(
                        <InspectorBoolean object={property} property="value" label={label} />
                    );
                    break;

                case "KeyMap":
                    property.value ??= property.value ?? iv.defaultValue ?? 0;
                    children.push(
                        <InspectorKeyMapButton object={property} property="value" label={label} />
                    );
                    break;

                case "Vector2":
                    if (iv.defaultValue) {
                        const defaultValue = iv.defaultValue as Vector2;
                        property.value ??= property.value ?? { x: defaultValue.x, y: defaultValue.y };
                    } else {
                        property.value ??= property.value ?? { x: 0, y: 0 };
                    }
                    children.push(
                        <InspectorVector2 object={property} property="value" label={label} step={0.01} />
                    );
                    break;
                case "Vector3":
                    if (iv.defaultValue) {
                        const defaultValue = iv.defaultValue as Vector3;
                        property.value ??= property.value ?? { x: defaultValue._x, y: defaultValue._y, z: defaultValue._z };
                    } else {
                        property.value ??= property.value ?? { x: 0, y: 0, z: 0 };
                    }
                    children.push(
                        <InspectorVector3 object={property} property="value" label={label} step={0.01} />
                    );
                    break;

                case "Color3":
                case "Color4":
                    if (iv.defaultValue) {
                        const defaultValue = iv.defaultValue as Color4;
                        property.value ??= property.value ?? { r: defaultValue.r, g: defaultValue.g, b: defaultValue.b, a: defaultValue.a };
                    } else {
                        property.value ??= property.value ?? { r: 0, g: 0, b: 0, a: iv.type === "Color4" ? 1 : undefined };
                    }
                    children.push(
                        <InspectorColor object={property} property="value" label={label} step={0.01} />
                    );
                    break;
            }
        });

        return (
            <InspectorSection title="Exported Values" children={children} />
        )
    }

    /**
     * Updates the visible properties from the script currently set.
     */
    private async _updateScriptVisibleProperties(): Promise<void> {
        // Stop watcher
        this._scriptWatcher?.close();
        this._scriptWatcher = null;

        if (!this.isMounted) { return; }

        // Check
        if (this.selectedObject.metadata.script.name === "None") {
            return this.isMounted && this.forceUpdate();
        }

        this.setState({ refresing: true });
        await this._refreshDecorators();

        const name = this.selectedObject.metadata.script.name as string;
        if (!name) { return; }
        
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
                    this._updateScriptVisibleProperties();
                }
            });
        }

        const inspectorValues = await SandboxMain.GetInspectorValues(jsPath) ?? [];

        this.setState({ refresing: false, inspectorValues });
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
