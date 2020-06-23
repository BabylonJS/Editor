import { join } from "path";
import { readJSON } from "fs-extra";

import * as React from "react";
import { Divider, Callout, Switch, Button } from "@blueprintjs/core";

import { Tools } from "../../editor/tools/tools";
import { IRegisteredPlugin } from "../../editor/tools/types";

import WorkspaceSettingsWindow from "./index";

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
                {this.props.settings.state.plugins?.map((p) => (
                    <Callout key={p.name} title={p.name} icon="series-derived">
                        <span style={{ color: "grey" }}>{p.path}</span>
                        <Switch key={p.path} checked={p.enabled} label="Enabled" onChange={() => this._handlePluginEnabled(p)} />
                        <Button text="Remove" icon="remove" fill={true} onClick={() => this._handleRemovePlugin(p)} />
                    </Callout>
                ))}
                <Divider />
                <Button text="Add..." icon="add" fill={true} onClick={() => this._handleAddPlugin()} />
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
     * Called on the user wants to remove a plugin.
     */
    private _handleRemovePlugin(plugin: IRegisteredPlugin): void {
        const plugins = this.props.settings.state.plugins?.slice() ?? [];

        const index = plugins.indexOf(plugin);
        if (index !== -1) {
            plugins.splice(index, 1);
            this.props.settings.setState({ plugins: plugins });
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
}
