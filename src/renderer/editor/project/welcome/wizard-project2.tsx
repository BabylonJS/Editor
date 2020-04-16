import * as React from "react";
import { FormGroup, InputGroup } from "@blueprintjs/core";

export interface IWelcomeWizardProps {

}

export interface IWelcomeWizardState {
    /**
     * Defines the name of the project.
     */
    projectName: string;
}

export class Wizard2 extends React.Component<IWelcomeWizardProps, IWelcomeWizardState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWelcomeWizardProps) {
        super(props);
        this.state = { projectName: "scene1" }
    }
    
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div key="step1" style={{ height: "400px", marginLeft: "15px", marginTop: "15px" }}>
                <FormGroup
                    helperText="Please provide a name for the project."
                    inline={false}
                    label="Project name"
                    labelFor="text-input"
                    labelInfo="(required)"
                >
                    <InputGroup id="text-input" placeholder="Placeholder text" value={this.state.projectName} onChange={(e) => this.setState({ projectName: e.target.value })} />
                </FormGroup>
            </div>
        );
    }
}
