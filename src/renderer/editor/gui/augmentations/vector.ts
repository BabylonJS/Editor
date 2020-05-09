import * as dat from "dat.gui";

export interface IVector {
    x: number;
    y: number;
    z?: number;
}

export class VectorController extends dat.controllers.Controller {
    private _title: HTMLSpanElement;
    private _container: HTMLDivElement;

    private __onChange: (v: IVector) => void;
    private __onFinishChange: (v: IVector) => void;

    /**
     * Constructor.
     * @param title defines the title of the controller.
     * @param vector defines the vector object to modify
     */
    public constructor(public title: string, public vector: IVector) {
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

        // Controllers sizes
        let percent = 0;
        if (this.vector.hasOwnProperty("x")) { percent++; }
        if (this.vector.hasOwnProperty("y")) { percent++; }
        if (this.vector.hasOwnProperty("z")) { percent++; }
        percent = (100 / percent);

        // Controllers
        if (this.vector.hasOwnProperty("x")) { this._addNumberController(percent, "x"); }
        if (this.vector.hasOwnProperty("y")) { this._addNumberController(percent, "y"); }
        if (this.vector.hasOwnProperty("z")) { this._addNumberController(percent, "z"); }
    }

    /**
     * Registers the given callback on an input changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onChange(cb: (v: IVector) => void): VectorController {
        this.__onChange = cb;
        return this;
    }

    /**
     * Registers the given callback on an input finished changes.
     * @param cb the callback to register on a controller changes (x, y, z, w).
     */
    public onFinishChange(cb: (v: IVector) => void): VectorController {
        this.__onFinishChange = cb;
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

        const c = new dat.controllers["NumberControllerBox"](this.vector, propertyPath);
        c.domElement.classList.add("c");
        c.domElement.style.width = "calc(100% - 25px)";
        c.onChange(() => this.__onChange && this.__onChange(this.vector));
        c.onFinishChange(() => this.__onFinishChange && this.__onFinishChange(this.vector));
        dummyController.domElement.appendChild(c.domElement);
    }
}

dat.GUI.prototype.addVector = function(title: string, vector: IVector): VectorController {
    const controller = new VectorController(title, vector);

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
