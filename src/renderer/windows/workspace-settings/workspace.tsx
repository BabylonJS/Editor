import * as React from "react";
import { Divider, Callout, FormGroup, InputGroup, Switch } from "@blueprintjs/core";

import WorkspaceSettingsWindow from "./index";

export interface IWorkspaceSettingsProps {
    /**
     * Defines the reference to the settings window.
     */
    settings: WorkspaceSettingsWindow;
}

export interface IWorkspaceSettingsState {
    
}

export class WorkspaceSettings extends React.Component<IWorkspaceSettingsProps, IWorkspaceSettingsState> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div>
                <Divider />
                <Callout title="Debug" icon="series-derived">
                    <FormGroup helperText="Defines the port of the webserver used while testing the game." label="Server Port" labelFor="port-input" labelInfo="(required)">
                        <InputGroup key="port-input" id="port-input" type="number" min="0" max={65536} value={this.props.settings.state.serverPort.toString()} onChange={(e) => this.props.settings.setState({ serverPort: parseInt(e.currentTarget.value) })} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout title="Project" icon="projects">
                    <FormGroup helperText="Options when saving the project" label="Scene Output Options" labelInfo="Optional">
                        <Switch label="Generate scene when saving project" checked={this.props.settings.state.generateSceneOnSave} onChange={(e) => this.props.settings.setState({ generateSceneOnSave: e.currentTarget.checked })} />
                        <Switch label="Save scene as binary file" checked={this.props.settings.state.useIncrementalLoading ?? false} onChange={(e) => this.props.settings.setState({ useIncrementalLoading: e.currentTarget.checked })} />
                    </FormGroup>
                    <Divider />
                    <FormGroup helperText="Defines all options for developers" label="Developer Options" labelInfo="Optional">
                        <Switch label="Watch project automatically" checked={this.props.settings.state.watchProject} onChange={(e) => this.props.settings.setState({ watchProject: e.currentTarget.checked })} />
                    </FormGroup>
                </Callout>
            </div>
        );
    }
}
