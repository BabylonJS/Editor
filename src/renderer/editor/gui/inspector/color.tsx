import * as React from "react";

import { Color3, Color4 } from "babylonjs";

import { InspectorNumber } from "./number";

export interface IInspectorColorProps {
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
    onChange?: (value: Color3 | Color4) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: Color3 | Color4) => void;
}

export interface IInspectorColorState {
    /**
     * Defines the current value of the input.
     */
    value: Color3 | Color4;
}

export class InspectorColor extends React.Component<IInspectorColorProps, IInspectorColorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorColorProps) {
        super(props);

        const value = props.object[props.property];
        if (!(value instanceof Color3) && !(value instanceof Color4)) {
            throw new Error("Only Vector3 from BabylonJS are supported for InspectorColor.");
        }

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let alpha: React.ReactNode;
        if (this.state.value instanceof Color4) {
            alpha = (
                <InspectorNumber
                    object={this.state.value}
                    property="a"
                    label= "Alpha"
                    step={this.props.step}
                    min={0}
                    max={1}
                    onChange={() => this.props.onChange?.(this.state.value)}
                    onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                />
            );
        }

        return (
            <div style={{ width: "100%", height: alpha ? "80px" : "50px" }}>
                <div style={{ width: "100%", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px" }}>
                    <span>{this.props.label}</span>
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="r"
                        label= "R"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="g"
                        label= "G"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="b"
                        label= "B"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                {alpha}
            </div>
        );
    }
}
