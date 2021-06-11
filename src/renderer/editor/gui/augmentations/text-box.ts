import * as dat from "dat.gui";

/**
 * Textbox
 */
export class TextBoxController extends dat.controllers.Controller {
    /**
     * Constructor.
     * @param content the text content to draw.
     */
    constructor(content: string) {
        super({ property: "property" }, "property");

        // Create text element
        const text = document.createElement("p");
        text.innerText = content;

        this.domElement.appendChild(text);
    }
}

dat.GUI.prototype.addTextBox = function (content: string): TextBoxController {
    // Create controller
    const controller = new TextBoxController(content);

    // Create li element
    const li = document.createElement("li");
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    return controller;
};
