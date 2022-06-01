import * as React from "react";
import { FormGroup, InputGroup, Switch, Callout } from "@blueprintjs/core";

export interface IWelcomeWizard1Props {

}

export interface IWorkspaceWizard1State {
    /**
     * Defines the port of the server used when testing the project.
     */
    serverPort: number;
    /**
     * Defines wether or not yarn should be used instead of npm as the
     * main package manager.
     */
    useYarnInsteadOfNpm: boolean;
    /**
     * Defines wether or not the workspace should be watched.
     */
    watchWorkspaceWithWebPack: boolean;
}

export class WorkspaceWizard1 extends React.Component<IWelcomeWizard1Props, IWorkspaceWizard1State> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWelcomeWizard1Props) {
        super(props);
        this.state = {
            serverPort: 1338,
            useYarnInsteadOfNpm: false,
            watchWorkspaceWithWebPack: true,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div key="step" style={{ height: "400px", marginLeft: "15px", marginTop: "15px" }}>
                <Callout title="Workspace Settings" icon="new-object">
                    <FormGroup helperText="Defines the port of the webserver used while testing the game." label="Server Port" labelFor="port-input" labelInfo="(required)">
                        <InputGroup key="port-input" id="port-input" type="number" min="0" max={65536} value={this.state.serverPort.toString()} onChange={(e) => this.setState({ serverPort: parseInt(e.currentTarget.value) })} />
                    </FormGroup>
                    <FormGroup helperText="Defines all options for developers" label="Developer Options" labelInfo="Optional">
                        <Switch label="Use Yarn instead of Npm" checked={this.state.useYarnInsteadOfNpm} onChange={(e) => this.setState({ useYarnInsteadOfNpm: e.currentTarget.checked })} />
                        <Switch label="Watch project using webpack" checked={this.state.watchWorkspaceWithWebPack} onChange={(e) => this.setState({ watchWorkspaceWithWebPack: e.currentTarget.checked })} />
                    </FormGroup>
                </Callout>
            </div>
        );
    }
}
