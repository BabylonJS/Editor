import * as dat from "dat.gui";
import { FactorGradient } from "babylonjs";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Slider, Button } from "@blueprintjs/core";
import { Icon } from "../icon";

export interface ISizeGradientProps {
    /**
     * Defines the gradient to edit.
     */
    gradient: FactorGradient;
}

export interface ISizeGradientState {
    /**
     * Defines the current gradient's factor.
     */
    factor: number;
}

export class SizeGradient extends React.Component<ISizeGradientProps, ISizeGradientState> {
    public constructor(props: ISizeGradientProps) {
        super(props);

        this.state = { factor: props.gradient.gradient };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <Slider min={0} max={1} stepSize={0.01} value={this.state.factor} onChange={(v) => this._handleFactorChanged(v)} />;
    }

    /**
     * Called on the user moves the slider.
     */
    private _handleFactorChanged(value: number): void {
        this.setState({ factor: value });
        this.props.gradient.gradient = value;
    }
}

export class GradientController extends dat.controllers.Controller {
    private _title: HTMLSpanElement;
    private _container: HTMLDivElement;

    private __onChange: (v: FactorGradient) => void;
    private __onFinishChange: (v: FactorGradient) => void;
    private __onRemove: (v: FactorGradient) => void;

    /**
     * Constructor.
     * @param title defines the title of the controller.
     * @param gradient defines the gradient object to modify
     */
    public constructor(public title: string, public gradient: FactorGradient) {
        super({ }, "");
    }

    /**
     * Inits the controller.
     */
    public init(): void {
        // Title
        this._title = document.createElement("span");
        this._title.innerText = this.title;
        this._title.style.width = "100%";
        this.__li.appendChild(this._title);

        // Container
        this._container = document.createElement("div");
        this._container.style.width = "100%";
        this.__li.appendChild(this._container);

        // Controllers
        this._addNumberController("f1", "factor1");
        this._addNumberController("f2", "factor2");
        this._addSlider();
        this._addRemoveButton();
    }

    /**
     * Registers the given callback on an input changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onChange(cb: (g: FactorGradient) => void): GradientController {
        this.__onChange = cb;
        return this;
    }

    /**
     * Registers the given callback on an input finished changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onFinishChange(cb: (g: FactorGradient) => void): GradientController {
        this.__onFinishChange = cb;
        return this;
    }

    /**
     * Retisters the given callback on the user wants to remove the gradient.
     * @param cb the callback to register the remove button has been clicked.
     */
    public onRemove(cb: (g: FactorGradient) => void): GradientController {
        this.__onRemove = cb;
        return this;
    }

    /**
     * Adds a new number controller.
     */
    private _addNumberController(name: string, propertyPath: string): void {
        const dummyController = new dat.controllers.Controller({ }, "");
        dummyController.domElement.style.width = "15%";
        dummyController.domElement.style.float = "left";
        this._container.appendChild(dummyController.domElement);

        const title = document.createElement("span");
        title.classList.add("property-name");
        title.style.width = "20px";
        title.innerHTML = `${name}: `;
        dummyController.domElement.appendChild(title);

        const c = new dat.controllers["NumberControllerBox"](this.gradient, propertyPath);
        c.domElement.classList.add("c");
        c.domElement.style.width = "calc(100% - 25px)";
        c.onChange(() => this.__onChange && this.__onChange(this.gradient));
        c.onFinishChange(() => this.__onFinishChange && this.__onFinishChange(this.gradient));
        dummyController.domElement.appendChild(c.domElement);
    }

    /**
     * Adds the factor slider.
     */
    private _addSlider(): void {
        const dummyController = new dat.controllers.Controller({ }, "");
        dummyController.domElement.style.width = "calc(70% - 60px)";
        dummyController.domElement.style.paddingTop = "5px";
        dummyController.domElement.style.float = "left";
        dummyController.domElement.style.paddingLeft = "10px";
        this._container.appendChild(dummyController.domElement);
        ReactDOM.render(<SizeGradient gradient={this.gradient} />, dummyController.domElement);
    }

    /**
     * Adds the remove button.
     */
    private _addRemoveButton(): void {
        const dummyController = new dat.controllers.Controller({ }, "");
        dummyController.domElement.style.width = "50px";
        dummyController.domElement.style.float = "left";
        this._container.appendChild(dummyController.domElement);
        ReactDOM.render(<Button small={true} style={{ marginLeft: "10px" }} icon={<Icon src="trash.svg" />} onClick={() => this.__onRemove && this.__onRemove(this.gradient)} />, dummyController.domElement);
    }
}

dat.GUI.prototype.addGradient = function(title: string, gradient: FactorGradient): GradientController {
    const controller = new GradientController(title, gradient);

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
