import * as React from "react";
import { PanelStack, IPanel, IPanelProps, Button, Intent, Divider } from "@blueprintjs/core";

export interface IWizardProps {
    /**
     * Defines the steps of the wizard.
     */
    steps: { title: string; element: JSX.Element }[];
    /**
     * Defines the height of the stack.
     */
    height: number;
    /**
     * Called on the wizard finished.
     */
    onFinish(): void;
}

export interface IWizardState {
    /**
     * Defines the current stack of panels.
     */
    stack: IPanel[];
    /**
     * Defines the current index in the stack.
     */
    stackIndex: number;
}

export class Wizard extends React.Component<IWizardProps, IWizardState> {
    private _steps: IPanel[] = [];

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWizardProps) {
        super(props);

        props.steps.forEach((s, i) => {
            this._steps.push({
                component: WizardStep,
                props: {
                    body: s.element,
                    steps: this._steps,
                    index: i,
                    onFinish: this.props.onFinish,
                },
                title: s.title,
            });
        });

        this.state = { stack: [], stackIndex: 0 };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div key="wizard-div" style={{ height: `${this.props.height}px` }}>
                <PanelStack
                    key="wizard"
                    showPanelHeader={true}
                    initialPanel={this._steps[0]}
                    onOpen={(p) => this._handleAddPanelToStack(p)}
                ></PanelStack>
            </div>
        );
    }

    /**
     * Adds a new panel to the stack.
     */
    private _handleAddPanelToStack(p: IPanel): void {
        this.setState({ stack: [p, ...this.state.stack] });
    }
}

export interface IWizardStepProps extends IPanelProps {
    /**
     * The body to draw in the panel.
     */
    body: JSX.Element;
    /**
     * Defines the index of the panel in the stack.
     */
    index: number;
    /**
     * Defines the
     */
    steps: IPanel[];
    /**
     * Called on the wizard finished.
     */
    onFinish(): void;
}

export class WizardStep extends React.Component<IWizardStepProps> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const nextPanel = this.props.steps[this.props.index + 1];
        const intent = nextPanel ? Intent.PRIMARY : Intent.SUCCESS;
        const text = nextPanel ? "Next" : "Finish";

        return (
            <>
                {this.props.body}
                <Divider key={`wizard-divider-${this.props.index}`} />
                <Button key={`wizard-next-${this.props.index}`} id={`wizard-next-${this.props.index}`} intent={intent} onClick={() => this.openNewPanel()} text={text} />
            </>
        );
    }

    /**
     * Opens a new panel. Adds a new
     */
    public openNewPanel(): void {
        const panel = this.props.steps[this.props.index + 1];
        if (!panel) { return this.props.onFinish(); }

        this.props.openPanel(panel);
    };
}
