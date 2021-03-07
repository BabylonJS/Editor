import * as React from "react";

import { Vector3 } from "babylonjs";

import { InspectorNumber } from "./number";

export interface IInspectorVector3Props {
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
     * Defines the step used when dragging the mouse.
     */
    step?: number;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: Vector3) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: Vector3) => void;
}

export interface IInspectorVector3State {
    /**
     * Defines the current value of the input.
     */
    value: Vector3;
}

export class InspectorVector3 extends React.Component<IInspectorVector3Props, IInspectorVector3State> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorVector3Props) {
        super(props);

        const value = props.object[props.property];
        if (!(value instanceof Vector3)) {
            throw new Error("Only Vector3 from BabylonJS are supported for InspectorNumber InspectorVector3.");
        }

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "50px" }}>
                <div style={{ width: "100%", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px" }}>
                    <span>{this.props.label}</span>
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="x"
                        label= "X"
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="y"
                        label= "Y"
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="z"
                        label= "Z"
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
            </div>
        );
    }
}
