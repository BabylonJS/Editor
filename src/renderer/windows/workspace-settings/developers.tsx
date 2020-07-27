import * as React from "react";
import { Divider, Callout, FormGroup, Switch } from "@blueprintjs/core";

import WorkspaceSettingsWindow from "./index";

export interface IDeveloperSettingsProps {
    /**
     * Defines the reference to the settings window.
     */
    settings: WorkspaceSettingsWindow;
}

export interface IDeveloperSettingsState {
    
}

export class DeveloperSettings extends React.Component<IDeveloperSettingsProps, IDeveloperSettingsState> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div>
                <Divider />
                <Callout title="Dev Tools" icon="console">
                    <FormGroup helperText="Requires to restart the Editor." label="Enable Dev Tools" labelInfo="Useful when developing a plugin to help debugging user interfaces.">
                        <Switch label="Enabled" checked={this.props.settings.state.developerMode ?? false} onChange={(e) => this.props.settings.setState({ developerMode: e.currentTarget.checked })} />
                    </FormGroup>
                </Callout>
            </div>
        );
    }
}
