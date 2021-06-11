import * as React from "react";
import { ISpinnerProps, Spinner } from "@blueprintjs/core";
import { Undefinable } from "../../../shared/types";

export interface IActivityIndicatorProps extends ISpinnerProps {
    /**
     * Called on the user clicks on the spinner.
     */
    onClick?: Undefinable<() => void>;
}

export interface IActivityIndicatorState {
    /**
     * Defines wether or not the activity indicator is enabled.
     */
    enabled: boolean;
}

export class ActivityIndicator extends React.Component<IActivityIndicatorProps, IActivityIndicatorState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: ISpinnerProps) {
        super(props);
        this.state = { enabled: false };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.enabled) { return null; }

        return (
            <div style={{ width: `${this.props.size}px`, height: `${this.props.size}px` }} onClick={() => this.props.onClick && this.props.onClick()}>
                <Spinner key="activity-indicator" size={this.props.size} value={this.props.value}></Spinner>
            </div>
        );
    }
}