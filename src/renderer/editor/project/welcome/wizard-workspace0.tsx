import { Undefinable } from "../../../../shared/types";

import * as React from "react";
import { Callout, Spinner, RadioGroup, Radio } from "@blueprintjs/core";
import { Tools } from "../../tools/tools";

export interface IWorkspaceTemplate {
    /**
     * Defines the name of the workspace template.
     */
    name: string;
    /**
     * Defines the file to load for the current template.
     */
    file: string;
}

export interface IWelcomeWizard0Props {

}

export interface IWorkspaceWizard0State {
    /**
     * Defines the list of available
     */
    availableProjects?: Undefinable<IWorkspaceTemplate[]>;
    /**
     * Defines the selected template.
     */
    selectedTemplate?: Undefinable<IWorkspaceTemplate>;
    /**
     * Defines a progress (in [0, 1]) of the downloading process.
     */
    downloadProgress?: Undefinable<number>;
}

export class WorkspaceWizard0 extends React.Component<IWelcomeWizard0Props, IWorkspaceWizard0State> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWelcomeWizard0Props) {
        super(props);
        this.state = { };
    }
    
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        // Render wizard
        let spinner: React.ReactNode;
        let availableProjects: React.ReactNode;

        if (!this.state.availableProjects) {
            spinner = (
                <>
                    <p>Refreshing available templates...</p>
                    <Spinner size={50}/>
                </>
            );
        } else {
            availableProjects = (
                <RadioGroup
                    key="template-type"
                    label="Please select a workspace template"
                    name="group"
                    onChange={(v) => this._handleTemplateTypeChanged((v.target as HTMLInputElement).value)}
                    selectedValue={this.state.selectedTemplate?.name}
                >
                    {this.state.availableProjects.map((ap) => <Radio key={ap.file} label={ap.name} value={ap.name} />)}
                </RadioGroup>
            );
        }

        return (
            <div key="step" style={{ height: "400px", marginLeft: "15px", marginTop: "15px" }}>
                <Callout title="Create new workspace">
                    {spinner}
                    {availableProjects}
                </Callout>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        const emptyTemplate = { name: "Empty", file: "project.zip" } as IWorkspaceTemplate;

        try {
            const data = await Tools.LoadFile<string>(`http://editor.babylonjs.com/templates/templates.json?${Date.now()}`, false);
            const templates = JSON.parse(data) as IWorkspaceTemplate[];

            this.setState({  selectedTemplate: emptyTemplate, availableProjects: [emptyTemplate].concat(templates) });
        } catch (e) {
            this.setState({  selectedTemplate: emptyTemplate, availableProjects: [emptyTemplate] });
        }
    }

    /**
     * Called on the user changes the template type.
     */
    private _handleTemplateTypeChanged(name: string): void {
        this.setState({ selectedTemplate: this.state.availableProjects?.find((ap) => ap.name === name) });
    }
}
