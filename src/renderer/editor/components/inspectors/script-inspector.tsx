import { shell } from "electron";
import { normalize, join, extname } from "path";
import { readFile, watch, FSWatcher, pathExists } from "fs-extra";
import { transpile, ModuleKind, ScriptTarget } from "typescript";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Classes, Icon, Pre, Spinner, Tooltip } from "@blueprintjs/core";

import { Scene, Node, Vector2, Vector3, Color4, Vector4, Quaternion } from "babylonjs";

import { IObjectInspectorProps } from "../inspector";

import { InspectorColor } from "../../gui/inspector/fields/color";
import { InspectorNumber } from "../../gui/inspector/fields/number";
import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorString } from "../../gui/inspector/fields/string";
import { InspectorBoolean } from "../../gui/inspector/fields/boolean";
import { InspectorSection } from "../../gui/inspector/fields/section";
import { InspectorVector3 } from "../../gui/inspector/fields/vector3";
import { InspectorVector2 } from "../../gui/inspector/fields/vector2";
import { InspectorVector4 } from "../../gui/inspector/fields/vector4";
import { InspectorKeyMapButton } from "../../gui/inspector/fields/keymap-button";
import { InspectorList, IInspectorListItem } from "../../gui/inspector/fields/list";

import { WorkSpace } from "../../project/workspace";

import { Tools } from "../../tools/tools";
import { AppTools } from "../../tools/app";

import { SandboxMain, IExportedInspectorValue } from "../../../sandbox/main";

import { AbstractInspector } from "./abstract-inspector";

export interface IScriptInspectorState {
    /**
     * Defines wether or not the script is being refreshing.
     */
    refreshing: boolean;
    /**
     * Defines wether or not there was an error while trying to load a given script
     */
    errorLoadingScript: Nullable<Error>;
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
            refreshing: false,
            errorLoadingScript: false,
            inspectorValues: [],
        };
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        // Check metadata
        this.selectedObject.metadata ??= {};
        this.selectedObject.metadata.script ??= {};
        this.selectedObject.metadata.script.name ??= "None";

        // Check workspace
        if (!WorkSpace.HasWorkspace()) { return null; }

        return (
            <InspectorSection title="Script">
                {this._getDragAndDropZone()}
                {this._getScriptsList()}
                {this._getOpenButton()}
                {this._getSpinner()}
                {this._getError()}
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
                data-tooltip="No Script Attached."
                onDrop={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "dashed black 1px";

                    try {
                        const dataContent = e.dataTransfer.getData("asset/typescript");
                        const data = JSON.parse(dataContent);

                        this.selectedObject.metadata.script.name = join("src", data.relativePath);
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
        return <InspectorButton label="Open..." onClick={() => shell.openPath(tsPath)} />
    }

    /**
     * Returns the spinner shown in case of refreshing.
     */
    private _getSpinner(): React.ReactNode {
        if (!this.state.refreshing) {
            return undefined;
        }

        return <Spinner size={35} />;
    }

    /**
     * Returns the error shown in case of script failing to load.
     */
    private _getError(): React.ReactNode {
        if (!this.state.errorLoadingScript) {
            return undefined;
        }

        return (
            <p>
                <Icon icon="error" color="red"></Icon>
                <Tooltip className={Classes.TOOLTIP_INDICATOR} content={
                    <Pre>
                        {this.state.errorLoadingScript.toString()}
                    </Pre>
                }>
                    Failed to load script.
                </Tooltip>
            </p>
        );
    }

    /**
     * Applies the given value on the associated node in the scene player if exists.
     */
    private _applyExportedValueInScenePlayer(propertyKey: string, propertyType: string, value: any): void {
        const playScene = this.editor.preview._scenePlayer?._scene;
        if (!playScene) {
            return;
        }

        let target: Nullable<Node | Scene> = null;
        if (this.selectedObject instanceof Scene) {
            target = this.selectedObject;
        } else {
            target = playScene.getNodeById(this.selectedObject["id"]);
        }

        if (!target) {
            return;
        }

        switch (propertyType) {
            case "number":
            case "string":
            case "boolean":
                target[propertyKey] = value;
                break;

            case "Vector2":
                target[propertyKey].copyFrom(value);
                break;
            case "Vector3":
                target[propertyKey].copyFrom({ _x: value.x, _y: value.y, _z: value.z });
                break;
            case "Vector4":
                target[propertyKey].copyFrom({ x: value.x, y: value.y, z: value.z, w: value.w });
                break;
            
            case "Quaternion":
                target[propertyKey].copyFrom({ _x: value.x, _y: value.y, _z: value.z, _w: value.w });
                break;

            case "Color3":
            case "Color4":
                target[propertyKey].copyFrom(value);
                break;
            case "Node":
                target[propertyKey] = this.editor.scene?.getNodeById(value);
                break;
        }

    }

    /**
     * Returns the list of all exported values.
     */
    private _getInspectorValues(): React.ReactNode {
        if (this.selectedObject.metadata.script.name === "None" || !this.state.inspectorValues.length) {
            return undefined;
        }

        this.selectedObject.metadata.script.properties ??= {};

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
                        <InspectorNumber object={property} property="value" label={label} min={iv.options?.min} max={iv.options?.max} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;

                case "string":
                    property.value ??= property.value ?? iv.defaultValue ?? "";
                    children.push(
                        <InspectorString object={property} property="value" label={label} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;

                case "boolean":
                    property.value ??= property.value ?? iv.defaultValue ?? false;
                    children.push(
                        <InspectorBoolean object={property} property="value" label={label} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;

                case "KeyMap":
                    property.value ??= property.value ?? iv.defaultValue ?? 0;
                    children.push(
                        <InspectorKeyMapButton object={property} property="value" label={label} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
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
                        <InspectorVector2 object={property} property="value" label={label} min={iv.options?.min} max={iv.options?.max} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
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
                        <InspectorVector3 object={property} property="value" label={label} min={iv.options?.min} max={iv.options?.max} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;
                case "Vector4":
                    if (iv.defaultValue) {
                        const defaultValue = iv.defaultValue as Vector4;
                        property.value ??= property.value ?? { x: defaultValue.x, y: defaultValue.y, z: defaultValue.z, w: defaultValue.w };
                    } else {
                        property.value ??= property.value ?? { x: 0, y: 0, z: 0, w: 0 };
                    }
                    children.push(
                        <InspectorVector4 object={property} property="value" label={label} min={iv.options?.min} max={iv.options?.max} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;

                case "Quaternion":
                    if (iv.defaultValue) {
                        const defaultValue = iv.defaultValue as Quaternion;
                        property.value ??= property.value ?? { x: defaultValue._x, y: defaultValue._y, z: defaultValue._z, w: defaultValue._w };
                    } else {
                        property.value ??= property.value ?? { x: 0, y: 0, z: 0, w: 0 };
                    }
                    children.push(
                        <InspectorVector4 object={property} property="value" label={label} min={iv.options?.min} max={iv.options?.max} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
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
                        <InspectorColor object={property} property="value" label={label} step={iv.options?.step ?? 0.01} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} />
                    );
                    break;
                case "Node":
                    if (typeof iv.defaultValue == "string") {
                        const defaultValue = this.editor.scene?.getNodeByName(iv.defaultValue);
                        property.value ??= property.value ?? defaultValue?.id;
                    } 
                  
                    children.push(
                        <InspectorList object={property} property="value" label={label} items={() => this.getSceneNodes(iv.options?.allowedNodeType)} noUndoRedo={true} onChange={(v) => this._applyExportedValueInScenePlayer(iv.propertyKey, iv.type, v)} dndHandledTypes={["graph/node"]} />
                    );
                    break;
            }
        });

        return (
            <InspectorSection title="Exported Values" children={children} />
        );
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
            this.editor.graph.refresh();
            return this.isMounted && this.forceUpdate();
        }

        this.setState({ refreshing: true, errorLoadingScript: null });
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

        try {
            const inspectorValues = await SandboxMain.GetInspectorValues(jsPath) ?? [];

            this.setState({ refreshing: false, inspectorValues });
            this.editor.graph.refresh();
        }
        catch (err) {
            this.setState({ refreshing: false, errorLoadingScript: err });
        }

    }

    /**
     * Refreshes the decorators functions that are used in the project.
     */
    private async _refreshDecorators(): Promise<void> {
        const decorators = await readFile(join(AppTools.GetAppPath(), "assets", "scripts", "decorators.ts"), { encoding: "utf-8" });
        const transpiledScript = transpile(decorators, { module: ModuleKind.None, target: ScriptTarget.ES5, experimentalDecorators: true });

        await SandboxMain.ExecuteCode(transpiledScript, "__editor__decorators__.js");
    }
}
