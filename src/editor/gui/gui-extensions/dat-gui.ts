import * as dat from 'dat-gui';

export const init = () => {
    // Inits the module to fake typings.
};

/**
 * Augmentify
 */
declare module 'dat-gui' {
    /**
     * Controllers namespace
     */
    export namespace controllers {
        /**
         * The base controller class that custom controllers must extend.
         */
        export class Controller {
            /**
             * The HTML DOM element.
             */
            public domElement: HTMLElement;
            /**
             * Constructor.
             * @param object the object to spy.
             * @param property the property in "object" being spied.
             */
            public constructor (object: any, property: string);

            public __li: HTMLLIElement;
            public __gui: dat.GUI;
        }
    }
    /**
     * Dom namespace
     */
    export namespace dom {
        /**
         * Static dom reference.
         */
        export const dom: any;
    }

    export interface GUI {
        /**
         * Adds a new text box.
         * @param content the content of the textbox.
         */
        addTextBox(content: string): dat.GUIController;
    }
}

/**
 * Textbox
 */
class TextBoxController extends dat.controllers.Controller {
    /**
     * Constructor.
     * @param content 
     */
    constructor (content: string) {
        super({ property: 'property' }, 'property');

        // Create text element
        const text = document.createElement('p');
        text.innerText = content;

        this.domElement.appendChild(text);
    }
}

dat.GUI.prototype.addTextBox = function (content: string): dat.GUIController {
    // Create controller
    const controller = new TextBoxController(content);

    // Create li element
    const li = document.createElement('li');
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    return <any> controller;
};
