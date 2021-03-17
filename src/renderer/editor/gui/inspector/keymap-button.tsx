import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Button } from "@blueprintjs/core";

import { InspectorNotifier } from "./notifier";
import { AbstractFieldComponent } from "./abstract-field";

export interface IInspectorKeyMapButtonProps<T> {
    /**
     * Defines the reference to the object to modify.
     */
    object: T;
    /**
     * Defines the property to edit in the object.
     */
    property: string;
    /**
     * Defines the label of the button.
     */
    label: string;

    /**
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;
    /**
     * Defines wether or not the button will be small.
     */
    small?: boolean;
    /**
     * Defines the callback called on the key changed.
     */
    onChange?: (keyCode: number, char: string) => void;
}

export interface IInspectorKeyMapButtonState {
    /**
     * Defines wether or not the key is being set.
     */
    settingKey: boolean;
}

export class InspectorKeyMapButton<T> extends AbstractFieldComponent<IInspectorKeyMapButtonProps<T>, IInspectorKeyMapButtonState> {
    private _keyDownListener: Nullable<(ev: KeyboardEvent) => any> = null;
    private _mouseDownListener: Nullable<(ev: MouseEvent) => any> = null;

    private _initialValue: number;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorKeyMapButtonProps<T>) {
        super(props);

        const value = this.props.object[this.props.property];
        if (typeof (value) !== "number") {
            throw new Error("Only numbers are supported for InspectorKeyMapButton component.");
        }

        this._initialValue = value;

        this.state = {
            settingKey: false,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const value = this.props.object[this.props.property];

        return (
            <Button
                fill={true}
                small={this.props.small}
                onClick={() => this._handleButtonClicked()}
            >
                {this.state.settingKey ? "Press the key to set" : `${this.props.label}: ${value}(${String.fromCharCode(value)})`}
            </Button>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount();

        InspectorNotifier.Register(this, this.props.object, () => {
            this.forceUpdate();
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();

        this._removeListeners();

        InspectorNotifier.Unregister(this);
    }

    /**
     * Called on the user clicks on the button.
     */
    private _handleButtonClicked(): void {
        if (this.state.settingKey) {
            return;
        }

        document.addEventListener("keydown", this._keyDownListener = (ev) => {
            this._handleKeyboardEvent(ev);
        });
        document.addEventListener("mousedown", this._mouseDownListener = () => {
            this._handleCancel();
        });

        this.setState({ settingKey: true });
    }

    /**
     * Called on the user pushes a keyboard key.
     */
    private _handleKeyboardEvent(ev: KeyboardEvent): void {
        this._removeListeners();

        const code = ev.keyCode;

        this.props.object[this.props.property] = code;
        this.props.onChange?.(code, String.fromCharCode(code));

        if (!this.props.noUndoRedo) {
            InspectorNotifier.NotifyChange(this.props.object, {
                caller: this,
                newValue: code,
                oldValue: this._initialValue,
                property: this.props.property,
                onUndoRedo: () => this.isMounted && this.forceUpdate(),
            });
        }

        this._initialValue = code;

        this.setState({ settingKey: false });
    }

    /**
     * Called on the user cancels setting the key.
     */
    private _handleCancel(): void {
        this._removeListeners();
        this.setState({ settingKey: false });
    }

    /**
     * Removes all the temporary listeners.
     */
    private _removeListeners(): void {
        if (this._keyDownListener) {
            document.removeEventListener("keydown", this._keyDownListener);
        }

        if (this._mouseDownListener) {
            document.removeEventListener("mousedown", this._mouseDownListener);
        }

        this._keyDownListener = null;
        this._mouseDownListener = null;
    }
}
