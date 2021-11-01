import * as React from "react";

import { InspectorNumber } from "./number";

export interface IVector2Like {
    /**
     * Defines the value of the X axis.
     */
    x: number;
    /**
     * Defines the value of the Y axis.
     */
    y: number;
}

export interface IInspectorVector2Props {
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
     * Defines the minimum value of the input.
     */
    min?: number;
    /**
     * Defines the maximum value of the input.
     */
    max?: number;
    /**
     * Defines the step used when dragging the mouse.
     */
    step?: number;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: IVector2Like) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: IVector2Like) => void;
}

export interface IInspectorVector2State {
    /**
     * Defines the current value of the input.
     */
    value: IVector2Like;
}

export class InspectorVector2 extends React.Component<IInspectorVector2Props, IInspectorVector2State> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorVector2Props) {
        super(props);

        const value = props.object[props.property];
        if (value.x === undefined || value.y === undefined) {
            throw new Error("Only Vector2 (x, y) are supported for InspectorVector2.");
        }

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "45px" }}>
                <div style={{ width: "100%", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px" }}>
                    <span>{this.props.label}</span>
                </div>
                <div style={{ float: "left", width: "50%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="x"
                        label="X"
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "50%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="y"
                        label="Y"
                        step={this.props.step}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
            </div>
        );
    }
}
