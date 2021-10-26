import * as React from "react";
import { Button, IconName, MaybeElement } from "@blueprintjs/core";

export interface IInspectorButtonProps {
    /**
     * Defines the label of the button.
     */
    label: string;

    /**
     * Defines wether or not the button will be small.
     */
    small?: boolean;
    /**
     * Defines wether or not the button is disabled.
     */
    disabled?: boolean;
    /**
     * Defines the optional icon of the button.
     */
    icon?: IconName | MaybeElement;
    /**
     * Defines the optional callback called on the button is clicked.
     */
    onClick?: () => void;
}

export class InspectorButton extends React.Component<IInspectorButtonProps> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorButtonProps) {
        super(props);
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <Button fill={true} small={this.props.small} disabled={this.props.disabled} icon={this.props.icon} onClick={() => this.props.onClick?.()}>{this.props.label}</Button>
    }
}
