import { readJSON, writeJSON } from "fs-extra";

import * as React from "react";
import { ButtonGroup, Button, Tabs, Tab, Navbar, Alignment, TabId } from "@blueprintjs/core";

import { IWorkSpace } from "../../editor/project/typings";
import { IPCTools } from "../../editor/tools/ipc";
import { IEditorPreferences } from "../../editor/tools/types";

import { WorkspaceSettings } from "./workspace";
import { CommonSettings } from "./common";
import { EditorSettings } from "./editor";
import { PluginsSettings } from "./plugins";

export const title = "Settings";

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
            pluginsPreferences: [],
            ...this.getPreferences(),
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div style={{ width: "100%", height: "calc(100% - 30px)", background: "#333333", overflow: "auto" }}>
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
                                <Tab id="editor" title="Editor" key="editor-tab" />
                                <Tab id="plugins" title="Plugins" key="plugins-tab" />
                            </Tabs>
                        </Navbar.Group>
                    </Navbar>
                    {this.state.navbarTabId === "workspace" ? <WorkspaceSettings settings={this} /> : undefined}
                    {this.state.navbarTabId === "common" ? <CommonSettings settings={this} /> : undefined}
                    {this.state.navbarTabId === "editor" ? <EditorSettings settings={this} /> : undefined}
                    {this.state.navbarTabId === "plugins" ? <PluginsSettings settings={this} /> : undefined}
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
        const preferences = this.getPreferences();
        preferences.terminalPath = this.state.terminalPath;
        preferences.zoom = this.state.zoom;
        preferences.scalingLevel = this.state.scalingLevel;
        preferences.positionGizmoSnapping = this.state.positionGizmoSnapping;
        preferences.plugins = this.state.plugins ?? [];

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
    public getPreferences(): IEditorPreferences {
        const settings = JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }") as IEditorPreferences;
        return settings;
    }
}
