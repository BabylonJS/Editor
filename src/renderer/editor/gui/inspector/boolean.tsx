import * as React from "react";
import { Alignment, Switch } from "@blueprintjs/core";

export interface IInspectorBooleanProps {
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
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: boolean) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: boolean) => void;
}

export interface IInspectorBooleanState {
    /**
     * Defines the current value of the input.
     */
    value: boolean;

    _overColor: string;
}

export class InspectorBoolean extends React.Component<IInspectorBooleanProps, IInspectorBooleanState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorBooleanProps) {
        super(props);

        const value = props.object[props.property];
        if (typeof (value) !== "boolean") {
            throw new Error("Only booleans are supported for InspectorBoolean components.");
        }

        this.state = {
            value,
            _overColor: "rgba(0, 0, 0, 0)",
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div
                style={{ width: "100%", height: "30px", background: this.state._overColor }}
                onMouseEnter={() => this.setState({ _overColor: "rgba(0, 0, 0, 0.2)" })}
                onMouseLeave={() => this.setState({ _overColor: "rgba(0, 0, 0, 0)" })}
            >
                <Switch
                    checked={this.state.value}
                    large={true}
                    label={this.props.label}
                    alignIndicator={Alignment.RIGHT}
                    onChange={(e) => this._handleValueChanged((e.target as HTMLInputElement).checked)}
                    style={{ paddingTop: "5px", borderLeft: "3px solid #806787", paddingLeft: "5px", fontSize: "14px" }}
                />
            </div>
        );
    }

    /**
     * Called on the value changed in the input.
     */
    private _handleValueChanged(value: boolean): void {
        this.setState({ value });

        this.props.object[this.props.property] = value;

        this.props.onChange?.(value);
        this.props.onFinishChange?.(value);
    }
}
