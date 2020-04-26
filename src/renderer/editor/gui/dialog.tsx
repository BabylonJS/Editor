import { Undefinable, Nullable } from "../../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Dialog as BPDialog, Button, Classes, FormGroup, InputGroup } from "@blueprintjs/core";

export interface IDialogProps {
    /**
     * The title to draw in the dialog
     */
    title: string;
    /**
     * The message to show in the dialog.
     */
    message: string;
    /**
     * The icon to show on top-left of the dialog.
     */
    icon: Undefinable<JSX.Element>;
    /**
     * Defines the html div element that contains the alert.
     */
    container: HTMLDivElement;
    /**
     * Defines wether or not the input should be a password.
     */
    password: Undefinable<boolean>;
    /**
     * Optional body element.
     */
    body?: Undefinable<JSX.Element>;
    /**
     * Called on the alert is closed.
     */
    onClose: (value: Nullable<string>) => void;
}

export class Dialog extends React.Component<IDialogProps> {
    /**
     * Shows the dialog with a title and a message.
     * @param title the title of the dialog.
     * @param message the message of the dialog.
     * @param icon the icon of the dialog to show on top-left.
     * @param password defines wether or not the input should be a password.
     */
    public static async Show(title: string, message: string, icon?: Undefinable<JSX.Element>, password?: boolean): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const container = document.createElement("div");
            container.style.position = "absolute";
            container.style.pointerEvents = "none";
            document.body.appendChild(container);

            const dialog = <Dialog title={title} message={message} icon={icon} container={container} password={password} onClose={(v) => v ? resolve(v) : reject("User decided to cancel dialog.")}></Dialog>;
            ReactDOM.render(dialog, container);
        });
    }

    private _enterListener: (this: Window, ev: WindowEventMap["keyup"]) => void;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <BPDialog
                isOpen={true}
                usePortal={true}
                title={this.props.title}
                icon={this.props.icon}
                className={Classes.DARK}
                enforceFocus={true}
                onClose={() => this._handleClose(true)}
            >
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup disabled={false} inline={false} label={this.props.message} labelFor="dialog-text-input" labelInfo="(required)">
                        <InputGroup id="dialog-text-input" placeholder="Value..." disabled={false} autoFocus={true} type={this.props.password ? "password" : "text"} />
                    </FormGroup>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={() => this._handleClose(false)}>Ok</Button>
                    </div>
                </div>
            </BPDialog>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        window.addEventListener("keyup", this._enterListener = (ev) => {
            if (ev.keyCode === 13) {
                this._handleClose(false);
            }
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        window.removeEventListener("keyup", this._enterListener);
    }

    /**
     * Called on the user clicks on the "Ok" button or closes the dialog.
     */
    private _handleClose(discard: boolean): void {
        const input = document.getElementById("dialog-text-input") as HTMLInputElement;

        ReactDOM.unmountComponentAtNode(this.props.container);
        this.props.container.remove();
        this.props.onClose(discard ? null : input.value);
    }
}