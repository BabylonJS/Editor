import * as React from "react";
import { Callout } from "@blueprintjs/core";

export interface IWelcomeWizardProps {

}

export interface IWelcomeWizardState {
    /**
     * Defines the currently selected project type.
     */
    projectType: string;
}

export class Wizard0 extends React.Component<IWelcomeWizardProps, IWelcomeWizardState> {
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
                <Callout title="Project wizard">
                    <p>Create a new project using the project wizard. Click "Next" to continue.</p>
                </Callout>
            </div>
        );
    }
}
