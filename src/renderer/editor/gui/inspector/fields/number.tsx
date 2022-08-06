// Shamely inspered by https://github.com/dataarts/dat.gui/blob/master/src/dat/controllers/NumberController.js

import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import Slider from "antd/lib/slider";
import { InputGroup, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

import { AbstractFieldComponent } from "./abstract-field";

export interface IInspectorNumberProps {
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
     * Defines the minimum value of the input.
     */
    min?: number;
    /**
     * Defines the maximum value of the input.
     */
    max?: number;

    /**
     * Defines wether or not the slider should be visible in case of a min and a max value.
     */
    noSlider?: boolean;
    /**
     * Defines wether or not the label should be hidden.
     */
    noLabel?: boolean;

    /**
     * Defines the default value of the field in case the editor property doesn't exist.
     */
    defaultValue?: number;

    /**
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: number) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     * @param oldValue defines the old value of the property before it has been changed.
     */
    onFinishChange?: (value: number, oldValue: number) => void;
}

export interface IInspectorNumberState {
    /**
     * Defines the current value of the input.
     */
    value: string;
}

export class InspectorNumber extends AbstractFieldComponent<IInspectorNumberProps, IInspectorNumberState> {
    private _mouseMoveListener: Nullable<(ev: MouseEvent) => any> = null;
    private _mouseUpListener: Nullable<(ev: MouseEvent) => any> = null;

    private _inspectorName: Nullable<string> = null;
    private _input: Nullable<HTMLInputElement> = null;

    private _impliedStep: number;
    private _precision: number;

    private _isFocused: boolean = false;

    private _lastMousePosition: number = 0;

    private _initialValue: number;

    private static _NumDecimals(value: number): number {
        const valueString = value.toString();
        const dotIndex = valueString.indexOf(".");

        if (dotIndex > -1) {
            return valueString.length - dotIndex - 1;
        }

        return 0;
    }

    private static _RoundToDecimal(value: number, decimals: number): number {
        const tenTo = Math.pow(10, decimals);
        return Math.round(value * tenTo) / tenTo;
    }

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorNumberProps) {
        super(props);

        let value = props.object[props.property];
        
        if (typeof (value) !== "number" && typeof (props.defaultValue) === "number") {
            value = props.defaultValue;
            props.object[props.property] = value;
        }

        if (typeof (value) !== "number") {
            throw new Error("Only number are supported for InspectorNumber components.");
        }

        if (props.step) {
            this._impliedStep = props.step;
        } else {
            this._impliedStep = value === 0 ? 1 : Math.pow(10, Math.floor(Math.log(Math.abs(value)) / Math.LN10)) / 10;
        }

        this._precision = InspectorNumber._NumDecimals(this._impliedStep);
        this._initialValue = value;

        this.state = { value: value.toString() };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let sliderNode: React.ReactNode;
        if (this.props.min !== undefined && this.props.max !== undefined && !this.props.noSlider) {
            sliderNode = (
                <div style={{ width: "55%", float: "left", padding: "0px 5px", marginTop: "0px" }}>
                    <Slider
                        key="min-max-slider"
                        value={parseFloat(this.state.value)}
                        min={this.props.min}
                        max={this.props.max}
                        step={this.props.step}
                        onChange={(v) => this._handleSliderChanged(v)}
                        onAfterChange={() => this._handleMouseUp()}
                    />
                </div>
            );
        }

        let label: React.ReactNode;
        if (!this.props.noLabel) {
            label = (
                <div style={{ width: "30%", height: "25px", float: "left", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px", overflow: "hidden" }}>
                    <Tooltip content={this.props.label}>
                        <span tabIndex={-1} style={{ lineHeight: "30px", textAlign: "center", whiteSpace: "nowrap" }}>{this.props.label}</span>
                    </Tooltip>
                </div>
            );
        }

        let widthPercent = "100%";
        if (sliderNode && label) {
            widthPercent = "15%";
        } else if (!sliderNode && label) {
            widthPercent = "70%";
        } else if (sliderNode && !label) {
            widthPercent = "45%";
        }

        return (
            <div style={{ width: "100%", height: "25px" }}>
                {label}
                {sliderNode}
                <div style={{ width: widthPercent, height: "25px", float: "left", marginTop: "3px" }}>
                    <InputGroup
                        small={true}
                        fill={true}
                        value={this.state.value}
                        type="number"
                        step={this.props.step}
                        onFocus={() => this._handleInputFocused()}
                        onBlur={() => this._handleInputBlurred()}
                        onKeyDown={(e) => e.key === "Enter" && this._handleEnterKeyPressed()}
                        onChange={(e) => this._handleValueChanged(e.target.value, false)}
                        onMouseDown={(ev) => this._handleInputClicked(ev)}
                        inputRef={(ref) => this._input = ref}
                    />
                </div>
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
     * Called on the input is focused.
     */
    private _handleInputFocused(): void {
        this._isFocused = true;
    }

    /**
     * Called on the input is blurred.
     */
    private _handleInputBlurred(): void {
        this._isFocused = false;
        this._handleValueFinishChanged();
    }

    /**
     * Called on the value changed in the input.
     */
    private _handleValueChanged(value: string, fromMouseEvent: boolean): void {
        if (!value) {
            return this.setState({ value });
        }

        let parsedValue = parseFloat(value);

        // Min / max
        if (this.props.min !== undefined && parsedValue < this.props.min) {
            parsedValue = this.props.min;
        }
        if (this.props.max !== undefined && parsedValue > this.props.max) {
            parsedValue = this.props.max;
        }

        // Set value
        this.props.object[this.props.property] = parsedValue;

        // Set state
        if (fromMouseEvent) {
            this.setState({ value: InspectorNumber._RoundToDecimal(parsedValue, this._precision).toString() });
        } else {
            this.setState({ value });
        }

        // Callback
        this.props.onChange?.(parsedValue);

        InspectorNotifier.NotifyChange(this.props.object[this.props.property], { caller: this });
    }

    /**
     * Called on the slider value changed.
     */
    private _handleSliderChanged(value: number): void {
        this._handleValueChanged(value.toString(), true);
    }

    /**
     * Called on the user clicked on the input.
     */
    private _handleInputClicked(ev: React.MouseEvent<HTMLInputElement, MouseEvent>): void {
        if (!this._isFocused) {
            return;
        }

        this._lastMousePosition = ev.pageY;

        document.addEventListener("mousemove", this._mouseMoveListener = (ev) => {
            const delta = (this._lastMousePosition - ev.pageY);
            const newValue = this.props.object[this.props.property] + delta * this._impliedStep;

            this._handleValueChanged(newValue.toString(), true);

            this._lastMousePosition = ev.pageY;
        });

        document.addEventListener("mouseup", this._mouseUpListener = () => {
            this._handleMouseUp();
        });
    }

    /**
     * Called on the mouse button is up on the document.
     */
    private _handleMouseUp(): void {
        if (this._mouseMoveListener) {
            document.removeEventListener("mousemove", this._mouseMoveListener);
        }

        if (this._mouseUpListener) {
            document.removeEventListener("mouseup", this._mouseUpListener);
        }

        this._mouseMoveListener = null;
        this._mouseUpListener = null;

        this._handleValueFinishChanged();
    }

    /**
     * Called on the value finished change.
     */
    private _handleValueFinishChanged(): void {
        const value = this.props.object[this.props.property];
        if (value === this._initialValue) {
            return;
        }

        this.props.onFinishChange?.(value, this._initialValue);

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

    /**
     * Called on the user presses the enter key.
     */
    private _handleEnterKeyPressed(): void {
        this._input?.blur();

        this._handleValueFinishChanged();
    }
}
