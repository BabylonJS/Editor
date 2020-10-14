import * as ReactDOM from "react-dom";
import * as dat from "dat.gui";

export class CustomController extends dat.controllers.Controller {
    /**
     * Constructor.
     * @param element the element to draw in the folder.
     */
    public constructor(element: JSX.Element) {
        super({ }, "");

        ReactDOM.render(element, this.domElement);
    }

    /**
     * Disposes the component.
     */
    public dispose(): void {
        ReactDOM.unmountComponentAtNode(this.domElement);
    }
}

dat.GUI.prototype.addCustom = function(height: string, element: JSX.Element, style?: Partial<CSSStyleDeclaration>): CustomController {
    const controller = new CustomController(element);

    // Create li element
    const li = document.createElement("li");
    li.classList.add("cr");
    li.style.height = height;
    li.setAttribute("style", `height: ${height}; background: #333333 !important;`);
    li.appendChild(controller.domElement);

    if (style) {
        Object.assign(li.style, style);
    }

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    return controller;
}
