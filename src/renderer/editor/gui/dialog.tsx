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
     */
    public static async Show(title: string, message: string, icon?: Undefinable<JSX.Element>): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const dialog = <Dialog title={title} message={message} icon={icon} onClose={(v) => v ? resolve(v) : reject("User decided to cancel dialog.")}></Dialog>;
            ReactDOM.render(dialog, document.getElementById("BABYLON-EDITOR-OVERLAY"));
        });
    }

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
                        <InputGroup id="dialog-text-input" placeholder="Value..." disabled={false} autoFocus={true} />
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
     * Called on the user clicks on the "Ok" button or closes the dialog.
     */
    private _handleClose(discard: boolean): void {
        const input = document.getElementById("dialog-text-input") as HTMLInputElement;
        this.props.onClose(discard ? null : input.value);
        ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element);
    }
}