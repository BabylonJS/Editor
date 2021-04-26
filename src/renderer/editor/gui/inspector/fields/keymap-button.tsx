import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { Button, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

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
    private _inspectorName: Nullable<string> = null;

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
        const height = this.props.small ? "25px" : "35px";

        return (
            <div style={{ width: "100%", height }}>
                <div style={{ width: "30%", height, float: "left", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px", overflow: "hidden" }}>
                    <Tooltip content={this.props.label}>
                        <span style={{ lineHeight: height, textAlign: "center", whiteSpace: "nowrap" }}>{this.props.label}</span>
                    </Tooltip>
                </div>

                <div style={{ width: "70%", height, float: "left", marginTop: "2px" }}>
                    <Button
                        fill={true}
                        small={this.props.small}
                        onClick={() => this._handleButtonClicked()}
                    >
                        {this.state.settingKey ? "Press the key to set" : `${value} (${String.fromCharCode(value)})`}
                    </Button>
                </div>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount();

        this._inspectorName = InspectorUtils.CurrentInspectorName;

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

        InspectorNotifier.NotifyChange(this.props.object, {
            caller: this,
        });

        this._initialValue = code;

        InspectorUtils.NotifyInspectorChanged(this._inspectorName!, {
            newValue: code,
            object: this.props.object,
            oldValue: this._initialValue,
            property: this.props.property,
            noUndoRedo: this.props.noUndoRedo ?? false,
        });

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
