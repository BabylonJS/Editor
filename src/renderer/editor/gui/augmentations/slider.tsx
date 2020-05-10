import * as ReactDOM from "react-dom";
import * as React from "react";
import { Slider } from "@blueprintjs/core";

import * as dat from "dat.gui";

export interface ICustomSliderProps {
    /**
     * Defines the min value of the slider.
     */
    min: number;
    /**
     * Defines the max value of the slider.
     */
    max: number;
    /**
     * Defines the step size of the slider.
     */
    step: number;
    /**
     * Defines the value of the slider;
     */
    value: number;
    /**
     * Called on the slider changed.
     */
    onChange: (value: number) => void;
}

export interface ICustomSliderState {
    /**
     * Defines the current value of the slider.
     */
    value: number;
}

export class CustomSlider extends React.Component<ICustomSliderProps, ICustomSliderState> {
    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: ICustomSliderProps) {
        super(props);
        this.state = { value: props.value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <Slider min={this.props.min} max={this.props.max} stepSize={this.props.step} value={this.state.value} onChange={(v) => this._handleChangeValue(v)} />
    }

    /**
     * Called on the user changes the slider.
     */
    private _handleChangeValue(value: number): void {
        this.setState({ value });
        this.props.onChange(value);
    }
}

export class SliderController extends dat.controllers.Controller {
    private _title: HTMLSpanElement;
    private __onChange: (value: number) => void;

    /**
     * Constructor
     * @param object the object to modify.
    * @param property the property of the object to get and set changes.
    * @param min defines the minimum value of the slider.
    * @param max defines the maximum value of the slider.
    * @param step defines the step size of the slider.
     */
    public constructor(object: any, property: string, private _min: number, private _max: number, private _step: number) {
        super(object, property);
    }

    /**
     * Inits the controller.
     */
    public init(): void {
        // Title
        this._title = document.createElement("span");
        this._title.innerText = this.property;
        this._title.style.width = "100%";
        this.__li.appendChild(this._title);

        // Container
        const container = document.createElement("div");
        container.style.width = "calc(100% - 20px)";
        container.style.paddingLeft = "10px";
        this.__li.appendChild(container);

        ReactDOM.render(<CustomSlider min={this._min} max={this._max} step={this._step} value={this.object[this.property]} onChange={(v) => this._handleChange(v)} />, container);
    }

    /**
     * Sets the new name of the controller.
     * @param name the new name of the controller.
     */
    public name(name: string): SliderController {
        this._title.innerText = name;
        return this;
    }

    /**
     * Registers the given callback on an input changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onChange(cb: (value: number) => void): SliderController {
        this.__onChange = cb;
        return this;
    }

    /**
     * Called on the slider changed.
     */
    private _handleChange(value: number): void {
        this.object[this.property] = value;
        if (this.__onChange) { this.__onChange(value); }
    }
}

dat.GUI.prototype.addSlider = function(object: any, property: string, min: number, max: number, step: number): SliderController {
    const controller = new SliderController(object, property, min, max, step);

    // Create li element
    const li = document.createElement("li");
    li.classList.add("cr");
    li.classList.add("number");
    li.style.height = "65px";
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();

    controller.__li = li;
    controller.__gui = this;
    controller.init();

    this.__controllers.push(controller);

    return controller;
}
