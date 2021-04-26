import { join } from "path";
import { platform } from "os";
import { readJSON } from "fs-extra";
import { execSync } from "child_process";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Divider, Callout, Switch, Button } from "@blueprintjs/core";

import { Tools } from "../../editor/tools/tools";
import { IPCTools } from "../../editor/tools/ipc";
import { ExecTools } from "../../editor/tools/exec";
import { IRegisteredPlugin } from "../../editor/tools/types";

import { Alert } from "../../editor/gui/alert";
import { Dialog } from "../../editor/gui/dialog";
import { Confirm } from "../../editor/gui/confirm";

import WorkspaceSettingsWindow from "./index";
import { TerminalComponent } from "./gui/terminal";

export interface IPluginsSettingsProps {
    /**
     * Defines the reference to the settings window.
     */
    settings: WorkspaceSettingsWindow;
}

export interface IPluginsSettingsState {
    
}

export class PluginsSettings extends React.Component<IPluginsSettingsProps, IPluginsSettingsState> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div>
                <Divider />
                <Button text="Add..." icon="add" fill={true} onClick={() => this._handleAddPlugin()} />
                <Button text="Add From NPM..." icon="add" fill={true} onClick={() => this._addFromNpm()} />
                <Divider />
                {this.props.settings.state.plugins?.map((p) => (
                    <Callout key={p.name} title={p.name} icon="series-derived">
                        <span style={{ color: "grey" }}>{p.path}</span>
                        <Switch key={p.path} checked={p.enabled} label="Enabled" onChange={() => this._handlePluginEnabled(p)} />
                        <Button text="Remove" icon="remove" fill={true} onClick={() => this._handleRemovePlugin(p)} />
                    </Callout>
                ))}
            </div>
        );
    }

    /**
     * Called on the user wants to add a new plugin.
     */
    private async _handleAddPlugin(): Promise<void> {
        const folder = await Tools.ShowSaveDialog();
        
        try {
            require(folder);
        } catch (e) {
            return;
        }

        const packageJson = await readJSON(join(folder, "package.json"), { encoding: "utf-8" });
        const plugins = this.props.settings.state.plugins?.slice() ?? [];

        const exists = plugins.find((p) => p.name === packageJson.name);
        if (exists) { return; }

        this.props.settings.setState({ plugins: plugins.concat([{
            name: packageJson.name,
            path: folder,
            enabled: true,
        }]) });
    }

    /**
     * Called on the user wants to add from NPM.
     */
    private async _addFromNpm(): Promise<void> {
        const moduleName = await Dialog.Show("NPM Package Name", "Please provide the name of the package");

        const plugins = this.props.settings.state.plugins?.slice() ?? [];
        const exists = plugins.find((p) => p.name === moduleName);
        
        if (exists) { return; }

        let alertRef: Nullable<Alert> = null;

        try {
            const sudo = platform() === "win32" ? "" : "sudo ";
            const program = ExecTools.ExecCommand(`${sudo}npm i -g ${moduleName} && exit`);

            Alert.Show("Installing...", `Installing "${moduleName}"...`, undefined,
                <TerminalComponent ref={(ref) => ref?.focus()} program={program.process} style={{ width: "450px", height: "500px" }} />,
                {
                    canOutsideClickClose: false,
                    isCloseButtonShown: false,
                    noFooter: true,
                },
                (ref) => alertRef = ref,
            );

            await program.promise;

            const globalNodeModules = execSync("npm root -g").toString().trim();
            this.props.settings.setState({ plugins: plugins.concat([{
                name: moduleName,
                path: join(globalNodeModules, moduleName),
                enabled: true,
                fromNpm: true,
            }]) }, () => {
                this._applyPluginsPreferences();
            });
        } catch (e) {
            Alert.Show("Failed To Install Plugin From NPM", e?.message ?? e);
        }

        alertRef!.close();
    }

    /**
     * Called on the user wants to remove a plugin.
     */
    private async _handleRemovePlugin(plugin: IRegisteredPlugin): Promise<void> {
        const confirm = await Confirm.Show("Remove Plugin", `Are you sure to remove the plugin named "${plugin.name}"?`);
        if (!confirm) { return; }

        // If comes from NPM, uninstall
        if (plugin.fromNpm) {
            let alertRef: Nullable<Alert> = null;

            try {
                const sudo = platform() === "win32" ? "" : "sudo ";
                const program = ExecTools.ExecCommand(`${sudo}npm uninstall -g ${plugin.name} && exit`);
                
                Alert.Show("Uninstalling...", `Uninstalling "${plugin.name}"...`, undefined,
                    <TerminalComponent program={program.process} style={{ width: "450px", height: "500px" }} />,
                    {
                        canOutsideClickClose: false,
                        isCloseButtonShown: false,
                        noFooter: true,
                    },
                    (ref) => alertRef = ref,
                );

                await program.promise;

            } catch(e) {
                // Catch silently.
            }

            alertRef!.close();
        }

        const plugins = this.props.settings.state.plugins?.slice() ?? [];

        const index = plugins.indexOf(plugin);
        if (index !== -1) {
            plugins.splice(index, 1);
            this.props.settings.setState({ plugins: plugins }, () => {
                this._applyPluginsPreferences();
            });
        }
    }

    /**
     * Called on the user enables/disables a plugin.
     */
    private _handlePluginEnabled(plugin: IRegisteredPlugin): void {
        const plugins = this.props.settings.state.plugins?.slice() ?? [];

        const index = plugins.indexOf(plugin);
        if (index !== -1) {
            plugins[index].enabled = !plugins[index].enabled;
            this.props.settings.setState({ plugins: plugins });
        }
    }

    /**
     * Applies the plugins preferences.
     */
    private _applyPluginsPreferences(): void {
        const preferences = this.props.settings.getPreferences();
        preferences.plugins = this.props.settings.state.plugins ?? [];

        localStorage.setItem("babylonjs-editor-preferences", JSON.stringify(preferences));

        IPCTools.ExecuteEditorFunction("_applyPreferences");
    }
}
