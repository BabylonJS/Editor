import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { IPCRequests } from "../../../shared/ipc";

import * as React from "react";
import { FormGroup, InputGroup, ButtonGroup, Button, Switch, Divider, Callout, FileInput } from "@blueprintjs/core";

import { IWorkSpace } from "../../editor/project/typings";
import { IPCTools } from "../../editor/tools/ipc";
import { IEditorPreferences } from "../../editor/tools/types";

export const title = "Workspace Settings";

export interface IWorkspaceSettingsState extends IWorkSpace, IEditorPreferences {
    /**
     * Defines the path to the workspace file.
     */
    workspacePath: string;
}

export default class WorkspaceSettingsWindow extends React.Component<{ }, IWorkspaceSettingsState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: { }) {
        super(props);

        this.state = {
            workspacePath: "",
            lastOpenedScene: "",
            serverPort: 0,
            generateSceneOnSave: false,
            firstLoad: true,
            watchProject: false,
            ...this._getPreferences(),
        };

        this._bindEvents();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div style={{ width: "100%", height: "calc(100% - 30px)", background: "#333333" }}>
                    <Callout title="Debug" icon="new-object">
                        <FormGroup helperText="Defines the port of the webserver used while testing the game." label="Server Port" labelFor="port-input" labelInfo="(required)">
                            <InputGroup key="port-input" id="port-input" type="number" min="0" max={65536} value={this.state.serverPort.toString()} onChange={(e) => this.setState({ serverPort: parseInt(e.currentTarget.value) })} />
                        </FormGroup>
                    </Callout>
                    <Divider />
                    <Callout title="Project" icon="new-object">
                        <FormGroup helperText="Options when saving the project" label="Project save" labelInfo="Optional">
                            <Switch label="Generate scene when saving project" checked={this.state.generateSceneOnSave} onChange={(e) => this.setState({ generateSceneOnSave: e.currentTarget.checked })} />
                        </FormGroup>
                        <FormGroup helperText="Defines all options for developers" label="Developer Options" labelInfo="Optional">
                            <Switch label="Watch project automatically" checked={this.state.watchProject} onChange={(e) => this.setState({ watchProject: e.currentTarget.checked })} />
                        </FormGroup>
                    </Callout>
                    <Divider />
                    <Callout title="Common" icon="cloud">
                        <FormGroup label="Terminal path">
                            <FileInput text={this.state.terminalPath ?? "Default"} fill={true} buttonText="Browse" onInputChange={(e) => this._handleTerminalPathChanged(e)} />
                        </FormGroup>
                    </Callout>
                </div>
                <div style={{ width: "100%", height: "30px", background: "#333333" }}>
                    <ButtonGroup>
                        <Button text="Apply" onClick={() => this._handleApply()} />
                        <Button text="Cancel" onClick={() => window.close()} />
                    </ButtonGroup>
                </div>
            </>
        );
    }

    /**
     * Called on the user saves the changes.
     */
    private async _handleApply(): Promise<void> {
        // Workspace
        await writeJSON(this.state.workspacePath, {
            lastOpenedScene: this.state.lastOpenedScene,
            serverPort: this.state.serverPort,
            generateSceneOnSave: this.state.generateSceneOnSave,
            firstLoad: this.state.firstLoad,
            watchProject: this.state.watchProject ?? false,
        } as IWorkSpace, {
            spaces: "\t",
        });

        await IPCTools.ExecuteEditorFunction("_refreshWorkSpace");

        // Editor preferences
        const preferences = this._getPreferences();
        preferences.terminalPath = this.state.terminalPath;

        localStorage.setItem("babylonjs-editor-preferences", JSON.stringify(preferences));

        // Close
        window.close();
    }

    /**
     * Binds the ipc events.
     */
    private _bindEvents(): void {
        ipcRenderer.on(IPCRequests.SendWindowMessage, (_ , data) => data.id === "workspace-path" && this._setWorkspace(data.path));
    }

    /**
     * Sets the workspace data.
     */
    private async _setWorkspace(path: string): Promise<void> {
        const json = await readJSON(path, { encoding: "utf-8" });
        this.setState({ workspacePath: path, ...json });
    }

    /**
     * Returns the current preferences of the editor.
     */
    private _getPreferences(): IEditorPreferences {
        const settings = JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }") as IEditorPreferences;
        return settings;
    }

    /**
     * Called on the user changed the terminal path.
     */
    private _handleTerminalPathChanged(e: React.FormEvent<HTMLInputElement>): void {
        const files = (e.target as HTMLInputElement).files;

        if (!files) { return; }
        if (!files?.length) { return; }

        this.setState({ terminalPath: files.item(0)!.path });
    }
}
