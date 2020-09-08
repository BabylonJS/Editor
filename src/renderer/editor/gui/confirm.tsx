import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, Button, Classes, Intent, IconName } from "@blueprintjs/core";

import { Undefinable } from "../../../shared/types";

export interface IConfirmProps {
    /**
     * The title of the dialog.
     */
    title: string;
    /**
     * The message of the dialog.
     */
    message: string;
    /**
     * The icon to show on top-left of the dialog.
     */
    icon: Undefinable<IconName | JSX.Element>;
    /**
     * Defines the html div element that contains the alert.
     */
    container: HTMLDivElement;
    /**
     * Called on the user clicks on "Yes" or "No".
     */
    onAnswer: (yes: boolean) => void;
}

export class Confirm extends React.Component<IConfirmProps> {
    /**
     * Shows the dialog.
     * @param title the title of the dialog.
     * @param message the message of the dialog.
     * @param icon the icon of the dialog to show on top-left.
     */
    public static async Show(title: string, message: string, icon?: Undefinable<IconName | JSX.Element>): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const container = document.createElement("div");
            container.style.position = "absolute";
            container.style.pointerEvents = "none";
            document.body.appendChild(container);

            const dialog = <Confirm title={title} message={message} container={container} icon={icon} onAnswer={resolve}></Confirm>;
            ReactDOM.render(dialog, container);
        });
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Dialog
                isOpen={true}
                usePortal={true}
                title={this.props.title}
                icon={this.props.icon}
                className={Classes.DARK}
                enforceFocus={true}
                onClose={() => this._handleClose(false)}
            >
                <div className={Classes.DIALOG_BODY}>
                    <p><strong>{this.props.message}</strong></p>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={() => this._handleClose(false)}>No</Button>
                        <Button onClick={() => this._handleClose(true)} intent={Intent.DANGER}>Yes</Button>
                    </div>
                </div>
            </Dialog>
        );
    }

    /**
     * Handles the close event.
     */
    private _handleClose(yes: boolean): void {
        ReactDOM.unmountComponentAtNode(this.props.container);
        this.props.container.remove();
        this.props.onAnswer(yes);
    }
}
