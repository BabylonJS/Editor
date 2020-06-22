import * as React from "react";
import { Divider, Callout, Intent, FormGroup, InputGroup, FileInput, RadioGroup, Radio } from "@blueprintjs/core";

import WorkspaceSettingsWindow from "./index";

export interface ICommonSettingsProps {
    /**
     * Defines the reference to the settings window.
     */
    settings: WorkspaceSettingsWindow;
}

export interface ICommonSettingsState {
    
}

export class CommonSettings extends React.Component<ICommonSettingsProps, ICommonSettingsState> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div>
                <Divider />
                <Callout intent={Intent.PRIMARY} title="Terminal" icon="console">
                    <FormGroup key="terminalPath" label="Terminal path">
                        <FileInput text={this.props.settings.state.terminalPath ?? "Default"} fill={true} buttonText="Browse" onInputChange={(e) => this._handleTerminalPathChanged(e)} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout intent={Intent.PRIMARY} title="User Interface" icon="intersection">
                    <FormGroup key="zoom" label="User Interface Size" labelInfo="Used to adapt resolution for high device ratios" labelFor="editor-zoom" helperText="Value between 0.5 and 2.">
                        <InputGroup id="editor-zoom" key="editor-zoom" type="number" min={0.5} max={2} value={this.props.settings.state.zoom ?? "1"} step={0.1} onChange={(e) => this.props.settings.setState({ zoom: e.currentTarget.value })} />
                    </FormGroup>
                </Callout>
                <Divider />
                <Callout intent={Intent.WARNING} title="Rendering" icon="camera">
                    <RadioGroup
                        label="Rendering Quality"
                        inline={true}
                        selectedValue={this.props.settings.state.scalingLevel ?? 1}
                        onChange={(v) => this.props.settings.setState({ scalingLevel: parseFloat(v.currentTarget.value) })}
                    >
                        <Radio key="high" label="High Quality" value={0.5} />
                        <Radio key="regular" label="Regular Quality" value={1} />
                        <Radio key="low" label="Low Quality" value={2} />
                    </RadioGroup>
                </Callout>
            </div>
        );
    }

    /**
     * Called on the user changed the terminal path.
     */
    private _handleTerminalPathChanged(e: React.FormEvent<HTMLInputElement>): void {
        const files = (e.target as HTMLInputElement).files;

        if (!files) { return; }
        if (!files?.length) { return; }

        this.props.settings.setState({ terminalPath: files.item(0)!.path });
    }
}
