import { readJSON, writeJSON } from "fs-extra";

import * as React from "react";
import {
    FormGroup, InputGroup, ButtonGroup, Button, Switch, Divider, Callout, FileInput,
    Tabs, Tab, Navbar, Alignment, TabId, Intent, RadioGroup, Radio,
} from "@blueprintjs/core";

import { IWorkSpace } from "../../editor/project/typings";
import { IPCTools } from "../../editor/tools/ipc";
import { IEditorPreferences } from "../../editor/tools/types";

export const title = "Workspace Settings";

export interface IWorkspaceSettingsState extends IWorkSpace, IEditorPreferences {
    /**
     * Defines the path to the workspace file.
     */
    workspacePath: string;
    /**
     * Defines the id of the active tab.
     */
    navbarTabId: TabId;
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
            navbarTabId: "workspace",

            lastOpenedScene: "",
            serverPort: 0,
            generateSceneOnSave: false,
            firstLoad: true,
            watchProject: false,
            ...this._getPreferences(),
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const workspaceContent = (
            <div>
                <Divider />
                <Callout title="Debug" icon="series-derived">
                    <FormGroup helperText="Defines the port of the webserver used while testing the game." label="Server Port" labelFor="port-input" labelInfo="(required)">
                        <InputGroup key="port-input" id="port-input" type="number" min="0" max={65536} value={this.state.serverPort.toString()} onChange={(e) => this.setState({ serverPort: parseInt(e.currentTarget.value) })} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout title="Project" icon="projects">
                    <FormGroup helperText="Options when saving the project" label="Project save" labelInfo="Optional">
                        <Switch label="Generate scene when saving project" checked={this.state.generateSceneOnSave} onChange={(e) => this.setState({ generateSceneOnSave: e.currentTarget.checked })} />
                    </FormGroup>
                    <FormGroup helperText="Defines all options for developers" label="Developer Options" labelInfo="Optional">
                        <Switch label="Watch project automatically" checked={this.state.watchProject} onChange={(e) => this.setState({ watchProject: e.currentTarget.checked })} />
                    </FormGroup>
                </Callout>
            </div>
        );
        
        const commonContent = (
            <div>
                <Divider />
                <Callout intent={Intent.PRIMARY} title="Terminal" icon="console">
                    <FormGroup key="terminalPath" label="Terminal path">
                        <FileInput text={this.state.terminalPath ?? "Default"} fill={true} buttonText="Browse" onInputChange={(e) => this._handleTerminalPathChanged(e)} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout intent={Intent.PRIMARY} title="User Interface" icon="intersection">
                    <FormGroup key="zoom" label="User Interface Size" labelInfo="Used to adapt resolution for high device ratios" labelFor="editor-zoom" helperText="Value between 0.5 and 2.">
                        <InputGroup id="editor-zoom" key="editor-zoom" type="number" min={0.5} max={2} value={this.state.zoom ?? "1"} step={0.1} onChange={(e) => this.setState({ zoom: e.currentTarget.value })} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout intent={Intent.WARNING} title="Rendering" icon="camera">
                    <RadioGroup
                        label="Rendering Quality"
                        inline={true}
                        selectedValue={this.state.scalingLevel ?? 1}
                        onChange={(v) => this.setState({ scalingLevel: parseFloat(v.currentTarget.value) })}
                    >
                        <Radio key="high" label="High Quality" value={0.5} />
                        <Radio key="regular" label="Regular Quality" value={1} />
                        <Radio key="low" label="Low Quality" value={2} />
                    </RadioGroup>
                </Callout>
            </div>
        );

        return (
            <>
                <div style={{ width: "100%", height: "calc(100% - 30px)", background: "#333333" }}>
                    <Navbar>
                        <Navbar.Group>
                            <Navbar.Heading>
                                <strong>Preferences</strong>
                            </Navbar.Heading>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Tabs
                                animate={true}
                                id="navbar"
                                large={true}
                                onChange={(navbarTabId) => this.setState({ navbarTabId })}
                                selectedTabId={this.state.navbarTabId}
                            >
                                <Tab id="workspace" title="Workspace" key="workspace-tab" />
                                <Tab id="common" title="Common" key="common-tab" />
                            </Tabs>
                        </Navbar.Group>
                    </Navbar>
                    {this.state.navbarTabId === "workspace" ? workspaceContent : undefined}
                    {this.state.navbarTabId === "common" ? commonContent : undefined}
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
     * Inits the plugin?
     * @param path defines the path to the workspace file.
     */
    public async init(path: string): Promise<void> {
        const json = await readJSON(path, { encoding: "utf-8" });
        this.setState({ workspacePath: path, ...json });
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

        // Editor preferences
        const preferences = this._getPreferences();
        preferences.terminalPath = this.state.terminalPath;
        preferences.zoom = this.state.zoom;
        preferences.scalingLevel = this.state.scalingLevel;

        localStorage.setItem("babylonjs-editor-preferences", JSON.stringify(preferences));

        // Apply
        await IPCTools.ExecuteEditorFunction("_refreshWorkSpace");
        await IPCTools.ExecuteEditorFunction("_applyPreferences");

        // Close
        window.close();
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
