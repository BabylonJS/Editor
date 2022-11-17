import * as React from "react";

import { InspectorNumber } from "./number";
import { InspectorNotifier } from "../notifier";

export interface IVector4Like {
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
    /**
     * Defines the value of the W axis.
     */
    w: number;
}

export interface IInspectorVector4Props {
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
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: IVector4Like) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: IVector4Like) => void;
}

export interface IInspectorVector4State {
    /**
     * Defines the current value of the input.
     */
    value: IVector4Like;
}

export class InspectorVector4 extends React.Component<IInspectorVector4Props, IInspectorVector4State> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorVector4Props) {
        super(props);

        const value = props.object[props.property];
        if (value.x === undefined || value.y === undefined || value.z === undefined || value.w === undefined) {
            throw new Error("Only Vector4 (x, y, z, w) are supported for InspectorVector4.");
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
                <div style={{ float: "left", width: "25%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="x"
                        label="X"
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        noUndoRedo={this.props.noUndoRedo}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "25%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="y"
                        label="Y"
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        noUndoRedo={this.props.noUndoRedo}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "25%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="z"
                        label="Z"
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        noUndoRedo={this.props.noUndoRedo}
                        onChange={() => this.props.onChange?.(this.state.value)}
                        onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                    />
                </div>
                <div style={{ float: "left", width: "25%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="w"
                        label="W"
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        noUndoRedo={this.props.noUndoRedo}
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
