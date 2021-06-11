import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import { Alignment, Switch, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

import { AbstractFieldComponent } from "./abstract-field";

export interface IInspectorBooleanProps<T> {
    /**
     * Defines the reference to the object to modify.
     */
    object: T;
    /**
     * Defines the property to edit in the object.
     */
    property: string;
    /**
     * Defines the label of the field.
     */
    label: string;

    /**
     * Defines the default value in case of possible undefined/null value.
     */
    defaultValue?: boolean;
    /**
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: boolean) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     * @param oldValue defines the old value of the property before it has been changed.
     */
    onFinishChange?: (value: boolean, oldValue: boolean) => void;
}

export interface IInspectorBooleanState {
    /**
     * Defines the current value of the input.
     */
    value: boolean;
    /**
     * Defines the color of the div on the mouse is over/out the switch.
     */
    overColor: string;
}

export class InspectorBoolean<T> extends AbstractFieldComponent<IInspectorBooleanProps<T>, IInspectorBooleanState> {
    private _input: Nullable<HTMLInputElement> = null;
    private _initialValue: boolean;

    private _inspectorName: Nullable<string> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorBooleanProps<T>) {
        super(props);

        const value = props.object[props.property] ?? props.defaultValue;
        if (typeof (value) !== "boolean") {
            throw new Error("Only booleans are supported for InspectorBoolean components.");
        }

        this._initialValue = value;

        this.state = {
            value,
            overColor: "rgba(0, 0, 0, 0)",
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div
                style={{ width: "100%", height: "25px", background: this.state.overColor }}
                onMouseEnter={() => this.setState({ overColor: "rgba(0, 0, 0, 0.2)" })}
                onMouseLeave={() => this.setState({ overColor: "rgba(0, 0, 0, 0)" })}
            >
                <Tooltip content={this.props.label} targetProps={{ style: { width: "100%" } }}>
                    <Switch
                        inputRef={(ref) => this._input = ref}
                        checked={this.state.value}
                        large={true}
                        label={this.props.label}
                        alignIndicator={Alignment.RIGHT}
                        onChange={(e) => this._handleValueChanged((e.target as HTMLInputElement).checked)}
                        style={{
                            paddingTop: "3px",
                            borderLeft: "3px solid #806787",
                            paddingLeft: "5px",
                            fontSize: "14px",
                            height: "25px",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                        }}
                    />
                </Tooltip>
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
    private _handleValueChanged(value: boolean): void {
        this.setState({ value });

        this._input?.blur();

        this.props.object[this.props.property] = value;

        this.props.onChange?.(value);
        this.props.onFinishChange?.(value, this._initialValue);

        // Undo/redo
        InspectorNotifier.NotifyChange(this.props.object, {
            caller: this,
        });

        InspectorUtils.NotifyInspectorChanged(this._inspectorName!, {
            newValue: value,
            object: this.props.object,
            oldValue: this._initialValue,
            property: this.props.property,
            noUndoRedo: this.props.noUndoRedo ?? false,
        });

        this._initialValue = value;
    }
}
