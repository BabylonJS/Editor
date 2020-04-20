import * as ReactDOM from "react-dom";
import * as React from "react";
import * as dat from "dat.gui";
import { Button } from "@blueprintjs/core";
import { Undefinable } from "../../../../shared/types";

export interface ICustomButtonProps {
    /**
     * defines the title of the button.
     */
    text: string;
}

export interface ICustomButtonState {
    /**
     * Callback called on the button is clicked.
     */
    onClick?: Undefinable<() => void>;
}

export class CustomButton extends React.Component<ICustomButtonProps, ICustomButtonState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: ICustomButtonProps) {
        super(props);
        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <Button small={true} text={this.props.text} fill={true} onClick={() => this.state.onClick && this.state.onClick()} />;
    }
}

export class ButtonController extends dat.controllers.Controller {
    private _button: CustomButton;
    private _refHandler = {
        getButton: (ref: CustomButton) => this._button = ref,
    };

    /**
     * Constructor.
     * @param text defines the title of the button.
     */
    public constructor(text: string) {
        super({ }, "");
        ReactDOM.render(<CustomButton ref={this._refHandler.getButton} text={text} />, this.domElement);
    }

    /**
     * Registers the given callback, called on the button is clicked.
     * @param callback the callback to register on the button is clicked.
     */
    public onClick(callback: () => void): void {
        setTimeout(() => this._button?.setState({ onClick: callback }), 0);
    }
}

dat.GUI.prototype.addButton = function(title: string): ButtonController {
    const controller = new ButtonController(title);

    // Create li element
    const li = document.createElement("li");
    li.classList.add("cr");
    li.classList.add("function");
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    return controller;
}
