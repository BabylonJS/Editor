import * as React from "react";
import { Alignment, Switch } from "@blueprintjs/core";

import { InspectorNotifier } from "./notifier";

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

export class InspectorBoolean<T> extends React.Component<IInspectorBooleanProps<T>, IInspectorBooleanState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorBooleanProps<T>) {
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
                style={{ width: "95%", height: "25px", background: this.state._overColor }}
                onMouseEnter={() => this.setState({ _overColor: "rgba(0, 0, 0, 0.2)" })}
                onMouseLeave={() => this.setState({ _overColor: "rgba(0, 0, 0, 0)" })}
            >
                <Switch
                    checked={this.state.value}
                    large={true}
                    label={this.props.label}
                    alignIndicator={Alignment.RIGHT}
                    onChange={(e) => this._handleValueChanged((e.target as HTMLInputElement).checked)}
                    style={{ paddingTop: "3px", borderLeft: "3px solid #806787", paddingLeft: "5px", fontSize: "14px", height: "25px" }}
                />
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
     public componentDidMount(): void {
        InspectorNotifier.Register(this, this.props.object, () => {
            this.setState({ value: this.props.object[this.props.property] });
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        InspectorNotifier.Unregister(this);
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
