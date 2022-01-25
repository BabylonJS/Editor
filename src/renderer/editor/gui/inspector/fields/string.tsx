import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { InputGroup, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

import { AbstractFieldComponent } from "./abstract-field";

export interface IInspectorStringProps {
    /**
     * Defines the reference to the object to modify.
     */
    object: any;
    /**
     * Defines the property to edit in the object.
     */
    property: string;
    /**
     * Defines the label of the field.
     */
    label: string;

    /**
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: string) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     * @param oldValue defines the old value of the edited string property.
     */
    onFinishChange?: (value: string, oldValue: string) => void;
}

export interface IInspectorStringState {
    /**
     * Defines the current value of the input.
     */
    value: string;
}

export class InspectorString extends AbstractFieldComponent<IInspectorStringProps, IInspectorStringState> {
    private _input: Nullable<HTMLInputElement> = null;
    private _initialValue: string;

    private _inspectorName: Nullable<string> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorStringProps) {
        super(props);

        const value = props.object[props.property];
        if (typeof (value) !== "string") {
            throw new Error("Only strings are supported for InspectorString components.");
        }

        this._initialValue = value;

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "25px" }}>
                <div style={{ width: "30%", float: "left", borderLeft: "3px solid #1ed36f", padding: "0 4px 0 5px" }}>
                    <Tooltip content={this.props.label}>
                        <span style={{ lineHeight: "30px", textAlign: "center", whiteSpace: "nowrap" }}>{this.props.label}</span>
                    </Tooltip>
                </div>
                <div style={{ width: "70%", float: "left", marginTop: "3px" }}>
                    <InputGroup
                        small={true}
                        fill={true}
                        value={this.state.value}
                        onChange={(e) => this._handleValueChanged(e.target.value)}
                        onBlur={() => this._handleValueFinishChanged()}
                        onKeyDown={(e) => e.key === "Enter" && this._handleValueFinishChanged()}
                        inputRef={(ref) => this._input = ref}
                    />
                </div>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        super.componentDidMount?.();

        this._inspectorName = InspectorUtils.CurrentInspectorName;

        InspectorNotifier.Register(this, this.props.object, () => {
            this.setState({ value: this.props.object[this.props.property] });
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount?.();

        InspectorNotifier.Unregister(this);
    }

    /**
     * Called on the value changed in the input.
     */
    private _handleValueChanged(value: string): void {
        this.setState({ value });

        this.props.object[this.props.property] = value;
        this.props.onChange?.(value);
    }

    /**
     * Called on the value did finish change.
     */
    private _handleValueFinishChanged(): void {
        if (this.state.value === this._initialValue) {
            return;
        }

        this.props.object[this.props.property] = this.state.value;
        this.props.onFinishChange?.(this.state.value, this._initialValue);

        // Undo/redo
        InspectorNotifier.NotifyChange(this.props.object, {
            caller: this,
        });

        InspectorUtils.NotifyInspectorChanged(this._inspectorName!, {
            object: this.props.object,
            newValue: this.state.value,
            oldValue: this._initialValue,
            property: this.props.property,
            noUndoRedo: this.props.noUndoRedo ?? false,
        });

        this._initialValue = this.state.value;

        this._input?.blur();
    }
}
