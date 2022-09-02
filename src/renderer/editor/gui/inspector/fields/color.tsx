import * as React from "react";

import { InspectorNumber } from "./number";
import { InspectorNotifier } from "../notifier";

export interface IColor4Like {
    /**
     * Defines the value of the red channel.
     */
    r: number;
    /**
     * Defines the value of the green channel.
     */
    g: number;
    /**
     * Defines the value of the blue channel.
     */
    b: number;
    /**
     * Defines the value of the alpha channel.
     */
    a?: number;
}

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
    onChange?: (value: IColor4Like) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: IColor4Like) => void;
}

export interface IInspectorColorState {
    /**
     * Defines the current value of the input.
     */
    value: IColor4Like;
}

export class InspectorColor extends React.Component<IInspectorColorProps, IInspectorColorState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorColorProps) {
        super(props);

        const value = props.object[props.property];
        if (value.r === undefined || value.g === undefined || value.b === undefined) {
            throw new Error("Only Color4 (r, g, b, a?) are supported for InspectorColor.");
        }

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let alpha: React.ReactNode;
        if (this.state.value.a !== undefined) {
            alpha = (
                <InspectorNumber
                    key="alpha-number"
                    object={this.state.value}
                    property="a"
                    label="Alpha"
                    step={this.props.step ?? 0.01}
                    min={0}
                    max={1}
                    onChange={() => this.props.onChange?.(this.state.value)}
                    onFinishChange={() => this.props.onFinishChange?.(this.state.value)}
                />
            );
        }

        return (
            <div style={{ width: "100%", height: alpha ? "75px" : "45px" }}>
                <div style={{ width: "100%", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px" }}>
                    <span>{this.props.label}</span>
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="r"
                        label="R"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this._onColorChange()}
                        onFinishChange={() => this._onColorFinishChange()}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="g"
                        label="G"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this._onColorChange()}
                        onFinishChange={() => this._onColorFinishChange()}
                    />
                </div>
                <div style={{ float: "left", width: "33%", height: "30px" }}>
                    <InspectorNumber
                        object={this.state.value}
                        property="b"
                        label="B"
                        step={this.props.step}
                        min={0}
                        max={1}
                        noSlider={true}
                        onChange={() => this._onColorChange()}
                        onFinishChange={() => this._onColorFinishChange()}
                    />
                </div>
                {alpha}
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
     public componentDidMount(): void {
        InspectorNotifier.Register(this, this.props.object[this.props.property], () => {
            this.setState({ value: this.props.object[this.props.property] });
        });

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
     * Called on the color changed.
     */
    private _onColorChange(): void {
        this.props.onChange?.(this.state.value);

        InspectorNotifier.NotifyChange(this.props.object[this.props.property], { caller: this });
    }

    /**
     * Called on the color finished changed.
     */
    private _onColorFinishChange(): void {
        this.props.onFinishChange?.(this.state.value);

        InspectorNotifier.NotifyChange(this.props.object[this.props.property], { caller: this });
    }
}
