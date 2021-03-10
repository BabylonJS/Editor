import * as React from "react";
import { SketchPicker } from "react-color";
import { Popover } from "@blueprintjs/core";

import { Color3, Color4, IColor4Like } from "babylonjs";

import { InspectorNotifier } from "./notifier";

export interface IInspectorColorPickerProps {
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
    onChange?: (value: Color3 | Color4) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: Color3 | Color4) => void;
}

export interface IInspectorColorPickerState {
    /**
     * Defines the current value of the input.
     */
    value: Color3 | Color4;
    /**
     * Defines the color in hexadecimal way.
     */
    hex: string;
    /**
     * Defines the color of the hex string.
     */
    textColor: string;
}

export class InspectorColorPicker extends React.Component<IInspectorColorPickerProps, IInspectorColorPickerState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorColorPickerProps) {
        super(props);

        const value = props.object[props.property];
        if (value.r === undefined || value.g === undefined || value.b === undefined) {
            throw new Error("Only Color4 (r, g, b, a?) are supported for InspectorColorPicker.");
        }

        this.state = { value, hex: value.toHexString(), textColor: "grey" };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "25px" }}>
                <div style={{ width: "30%", height: "25px", float: "left", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px" }}>
                    <span style={{ lineHeight: "30px", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{this.props.label}</span>
                </div>
                <div style={{ width: "70%", height: "25px", float: "left", marginTop: "3px" }}>
                    <Popover
                        interactionKind="click"
                        usePortal={true}
                        fill={true}
                        content={
                            <div style={{ color: "black" }}>
                                <SketchPicker
                                    color={this.state.hex}
                                    onChange={(c) => this._handleColorChange(c)}
                                    onChangeComplete={(c) => this._handleColorFinishChange(c)}
                                />
                            </div>
                        }
                    >
                        <div
                            style={{
                                width: "100%", 
                                height: "20px",
                                backgroundColor: this.state.hex,
                                cursor: "pointer",
                            }}
                        >
                            <h5
                                style={{ textAlign: "center", lineHeight: "20px", color: this.state.textColor }}
                            >
                                {this.state.hex}
                            </h5>
                        </div>
                    </Popover>
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

    /**
     * Called on the color changed.
     */
    private _handleColorChange(color: any): void {
        const normalizedColor = {
            r: color.rgb.r / 255,
            g: color.rgb.g / 255,
            b: color.rgb.b / 255,
            a: (color.rgb.a ?? 255) / 255,
        };

        const textColor = (color.hsv.v < 0.5 || color.hsv.s > 0.5) ? "white" : "black";

        this.setState({ hex: color.hex, textColor });

        this.props.object[this.props.property].r = normalizedColor.r;
        this.props.object[this.props.property].g = normalizedColor.g;
        this.props.object[this.props.property].b = normalizedColor.b;

        if (this.props.object[this.props.property] instanceof Color4) {
            this.props.object[this.props.property].a = normalizedColor.a;
        }

        this.props.onChange?.(this.props.object);
    }

    /**
     * Called on the color finished change.
     */
    private _handleColorFinishChange(color: IColor4Like): void {
        this._handleColorChange(color);

        this.props.onFinishChange?.(this.props.object);
    }
}
