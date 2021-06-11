import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, Button, Classes } from "@blueprintjs/core";

import { Undefinable } from "../../../shared/types";

export interface IAlertOptions {
    /**
     * Defines whether clicking outside the overlay element (either on backdrop when present or on document)
     * should invoke `onClose`.
     */
    canOutsideClickClose?: boolean;
    /**
     * Defines whether to show the close button in the dialog's header.
     * Note that the header will only be rendered if `title` is provided.
     */
    isCloseButtonShown?: boolean;
    /**
     * Defines wehter or not footer should be shown.
     */
    noFooter?: boolean;
    /**
     * Defines the optional style of the alert.
     */
    style?: React.CSSProperties;
}

export interface IAlertProps extends IAlertOptions {
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
    icon: Undefinable<JSX.Element>;
    /**
     * Defines the html div element that contains the alert.
     */
    container: HTMLDivElement;
    /**
     * Optional body element.
     */
    body?: Undefinable<JSX.Element>;
    /**
     * Called on the alert is closed.
     */
    onClose: () => void;
}

export class Alert extends React.Component<IAlertProps, { }> {
    /**
     * Shows the dialog with a title and a message.
     * @param title the title of the dialog.
     * @param message the message of the dialog.
     * @param icon the icon of the dialog to show on top-left.
     * @param body optional body to draw in the alert.
     */
    public static async Show(title: string, message: string, icon?: Undefinable<JSX.Element>, body?: Undefinable<JSX.Element>, options?: IAlertOptions, ref?: (ref: Alert) => void): Promise<void> {
        return new Promise<void>((resolve) => {
            const container = document.createElement("div");
            container.style.position = "absolute";
            container.style.pointerEvents = "none";
            document.body.appendChild(container);

            const dialog = (
                <Alert
                    ref={ref}
                    title={title}
                    message={message}
                    icon={icon}
                    container={container}
                    body={body}
                    onClose={resolve}
                    canOutsideClickClose={options?.canOutsideClickClose}
                    noFooter={options?.noFooter}
                    isCloseButtonShown={options?.isCloseButtonShown}
                    style={options?.style}
                ></Alert>
            );
            ReactDOM.render(dialog, container);
        });
    }

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IAlertProps) {
        super(props);
        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const footer = this.props.noFooter ? undefined : (
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button style={{ width: "100px" }} onClick={() => this.close()}>Ok</Button>
                </div>
            </div>
        );

        return (
            <Dialog
                isOpen={true}
                usePortal={true}
                title={this.props.title}
                icon={this.props.icon}
                className={Classes.DARK}
                enforceFocus={true}
                canEscapeKeyClose={this.props.canOutsideClickClose ?? true}
                canOutsideClickClose={this.props.canOutsideClickClose ?? true}
                isCloseButtonShown={this.props.isCloseButtonShown}
                onClose={() => this.close()}
                style={this.props.style}
            >
                <div className={Classes.DIALOG_BODY}>
                    <p><strong>{this.props.message}</strong></p>
                    <br />
                    {this.props.body}
                </div>
                {footer}
            </Dialog>
        );
    }

    /**
     * Called on the user clicks on the "Ok" button or closes the dialog.
     */
    public close(): void {
        ReactDOM.unmountComponentAtNode(this.props.container);
        this.props.container.remove();
        this.props.onClose && this.props.onClose();
    }
}
