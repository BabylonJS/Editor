import * as dat from "dat.gui";

export interface IColor {
    r: number;
    g: number;
    b: number;
}

export class ColorController extends dat.controllers.Controller {
    private _title: HTMLSpanElement;
    private _container: HTMLDivElement;

    private __onChange: (v: IColor) => void;
    private __onFinishChange: (v: IColor) => void;

    private _numberControllers: dat.GUIController[] = [];

    /**
     * Constructor.
     * @param title defines the title of the controller.
     * @param color defines the vector object to modify
     */
    public constructor(public title: string, public color: IColor) {
        super(color, "");
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

        // Controllers sizes
        let percent = 0;
        if ((this.color.r ?? null) !== null) { percent++; }
        if ((this.color.g ?? null) !== null) { percent++; }
        if ((this.color.b ?? null) !== null) { percent++; }
        percent = (100 / percent);

        // Controllers
        if ((this.color.r ?? null) !== null) { this._addNumberController(percent, "r"); }
        if ((this.color.g ?? null) !== null) { this._addNumberController(percent, "g"); }
        if ((this.color.b ?? null) !== null) { this._addNumberController(percent, "b"); }
    }

    /**
     * Registers the given callback on an input changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onChange(cb: (v: IColor) => void): ColorController {
        this.__onChange = cb;
        return this;
    }

    /**
     * Registers the given callback on an input finished changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onFinishChange(cb: (v: IColor) => void): ColorController {
        this.__onFinishChange = cb;
        return this;
    }

    /**
     * Updates the current display of the controller.
     */
    public updateDisplay(): ColorController {
        this._numberControllers.forEach((c) => c.updateDisplay());
        return this;
    }

    /**
     * Adds a new number controller.
     */
    private _addNumberController(percent: number, propertyPath: string): void {
        const dummyController = new dat.controllers.Controller({ }, "");
        dummyController.domElement.style.width = `${percent}%`;
        dummyController.domElement.style.float = "left";
        this._container.appendChild(dummyController.domElement);

        const title = document.createElement("span");
        title.classList.add("property-name");
        title.style.width = "20px";
        title.innerHTML = `${propertyPath}: `;
        dummyController.domElement.appendChild(title);

        const c = new dat.controllers["NumberControllerBox"](this.color, propertyPath);
        c.step(0.01);
        c.domElement.classList.add("c");
        c.domElement.style.width = "calc(100% - 25px)";
        c.min(0);
        c.max(1);
        c.step(0.01);
        c.onChange(() => {
            if (this.__onChange) {
                this["property"] = c.property;
                this["initialValue"] = c.initialValue;
                this.__onChange(this.color[propertyPath]);
            }
        });
        c.onFinishChange(() => {
			if (this.__onFinishChange) {
				this["property"] = c.property;
				this["initialValue"] = c.initialValue;
				this.__onFinishChange(this.color[propertyPath]);
			}
		});

        this._numberControllers.push(c);
        dummyController.domElement.appendChild(c.domElement);
    }
}

dat.GUI.prototype.addAdvancedColor = function(title: string, color: IColor): ColorController {
    const controller = new ColorController(title, color);

    // Create li element
    const li = document.createElement("li");
    li.classList.add("cr");
    li.classList.add("number");
    li.style.height = "55px";
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
