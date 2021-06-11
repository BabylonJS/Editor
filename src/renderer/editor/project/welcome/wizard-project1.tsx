import * as React from "react";
import { RadioGroup, Radio } from "@blueprintjs/core";

export interface IWelcomeWizardProps {

}

export interface IWelcomeWizardState {
    /**
     * Defines the currently selected project type.
     */
    projectType: string;
}

export class Wizard1 extends React.Component<IWelcomeWizardProps, IWelcomeWizardState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWelcomeWizardProps) {
        super(props);
        this.state = { projectType: "Empty" }
    }
    
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div key="step0" style={{ height: "400px", marginLeft: "15px", marginTop: "15px" }}>
                <RadioGroup
                    label="Please select a project type."
                    name="group"
                    onChange={(v) => this.setState({ projectType: (v.target as HTMLInputElement).value })}
                    selectedValue={this.state.projectType}
                >
                    <Radio label="Empty" value="Empty" />
                    <Radio label="Simple" value="Simple" />
                </RadioGroup>
            </div>
        );
    }
}
