import * as React from "react";

import { InspectorNumber } from "./number";
import { InspectorNotifier } from "./notifier";

export interface IVector3Like {
    /**
     * Defines the value of the X axis.
     */
    x: number;
    /**
     * Defines the value of the Y axis.
     */
    y: number;
    /**
     * Defines the value on the Z axis.
     */
    z: number;
}

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
    onChange?: (value: IVector3Like) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: IVector3Like) => void;
}

export interface IInspectorVector3State {
    /**
     * Defines the current value of the input.
     */
    value: IVector3Like;
}

export class InspectorVector3 extends React.Component<IInspectorVector3Props, IInspectorVector3State> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorVector3Props) {
        super(props);

        const value = props.object[props.property];
        if (value.x === undefined || value.y === undefined || value.z === undefined) {
            throw new Error("Only Vector3 (x, y, z) are supported for InspectorVector3.");
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
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="x"
                        label= "X"
                        step={this.props.step}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="y"
                        label= "Y"
                        step={this.props.step}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="z"
                        label= "Z"
                        step={this.props.step}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
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
}
