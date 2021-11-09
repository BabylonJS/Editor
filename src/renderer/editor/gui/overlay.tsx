import * as React from "react";
import * as ReactDOM from "react-dom";
import { Spinner, Overlay as BPOverlay, Classes } from "@blueprintjs/core";

import { Undefinable, Nullable } from "../../../shared/types";

export interface IOverlayProps {
    /**
     * Defines the message to show in the overlay.
     */
    message: Undefinable<string>;
    /**
     * Defines wether or not the overlay has a spinner.
     */
    spinner: Undefinable<boolean>;
}

export interface IOverlayState extends IOverlayProps {
    /**
     * Defines the known value of the spinner. Typically used to show a percentage of a process.
     * @example a loading process.
     */
    spinnerValue: Undefinable<number>;
    /**
     * Defines wether or not the overlay is open.
     */
    isOpen: boolean;
}

export class Overlay extends React.Component<IOverlayProps, IOverlayState> {
    private static _overlay: Nullable<Overlay> = null;
    private static _refHandler = {
        getOverlay: (ref: Overlay) => Overlay._overlay = ref,
    };

    /**
     * Shows the overlay with the given message and spinner.
     * @param message the message to show in the overlay.
     * @param spinner wether or not the overlay has a spinner.
     */
    public static Show(message: string, spinner: boolean = false): void {
        // Already exists?d
        if (this._overlay) { return; }

        // Create it.
        const overlay = <Overlay message={message} spinner={spinner} ref={this._refHandler.getOverlay}></Overlay>;
        ReactDOM.render(overlay, document.getElementById("BABYLON-EDITOR-OVERLAY"));
    }

    /**
     * Hides the overlay.
     */
    public static Hide(): void {
        if (!this._overlay) { return; }

        this._overlay = null;
        ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element);
    }

    /**
     * Sets the new message of the overlay.
     * @param message the new message to show in the overlay.
     */
    public static SetMessage(message: string): void {
        this._overlay?.setState({ message });
    }

    /**
     * Sets wether or not the overlay has a spinner.
     * @param spinner wether or not the overlay has a spinner.
     */
    public static SetSpinner(spinner: boolean): void {
        this._overlay?.setState({ spinner });
    }

    /**
     * Sets the new known value of the spinner.
     * @param spinnerValue the new known value of the spinner.
     */
    public static SetSpinnervalue(spinnerValue?: number): void {
        this._overlay?.setState({ spinner: true, spinnerValue });
    }

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IOverlayProps) {
        super(props);
        this.state = {
            message: props.message,
            spinner: props.spinner,
            spinnerValue: undefined,
            isOpen: true,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <BPOverlay className={Classes.OVERLAY_SCROLL_CONTAINER} isOpen={this.state.isOpen} usePortal={true} enforceFocus={true} autoFocus={true} canOutsideClickClose={false} hasBackdrop={true}>
                <div style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", userSelect: "none" }}>
                    <h1 style={{ color: "grey", textAlign: "center" }}>{this.state.message}</h1>
                    <Spinner size={200} value={this.state.spinnerValue}></Spinner>
                </div>
            </BPOverlay>
        );
    }
}
