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
        addTextBox(content: string): TextBoxController;
        /**
         * Adds a new image preview.
         * @param url the url of the image to show
         */
        addImage(url: string): ImageBoxController;
    }
}

/**
 * Textbox
 */
export class TextBoxController extends dat.controllers.Controller {
    /**
     * Constructor.
     * @param content the text content to draw.
     */
    constructor (content: string) {
        super({ property: 'property' }, 'property');

        // Create text element
        const text = document.createElement('p');
        text.innerText = content;

        this.domElement.appendChild(text);
    }
}

dat.GUI.prototype.addTextBox = function (content: string): TextBoxController {
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

    return controller;
};

/**
 * Image
 */
export class ImageBoxController extends dat.controllers.Controller {
    public img: HTMLImageElement;
    public onLoaded: (img: HTMLImageElement) => void;
    public onError: (img: HTMLImageElement) => void;

    /**
     * Constructor.
     * @param url the url of the image.
     */
    constructor (url: string) {
        super({ property: 'property' }, 'property');

        this.img = document.createElement('img');
        this.img.src = url;

        this.domElement.appendChild(this.img);
    }

    /**
     * Sets the Url of the image.
     * @param url the url of the image to laod.
     */
    public setUrl (url: string): void {
        this.img.src = url;
    }
}

dat.GUI.prototype.addImage = function (url: string): ImageBoxController {
    // Create controller
    const controller = new ImageBoxController(url);

    // Create li element
    const li = document.createElement('li');
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    li.style.marginLeft = 'auto';
    li.style.marginRight = 'auto';
    li.style.height = '0px';
    controller.img.style.visibility = 'hidden';

    controller.img.onerror = () => {
        li.style.height = '0px';
        controller.onError && controller.onError(controller.img);
    };
    controller.img.onload = (img) => {
        const ratio = Math.min(100 / controller.img.width, 100 / controller.img.height);
        if (!isNaN(ratio)) {
            if (controller.img.width > controller.img.height) {
                const width = (controller.img.width * ratio) + 'px';
                controller.img.style.width = width;
                li.style.width = width;
                $(li).animate({ height: width }, 300);
            } else {
                const height = (controller.img.height * ratio) + 'px';
                controller.img.style.height = height;
                li.style.width = height;
                $(li).animate({ height: height }, 300);
            }
        }

        controller.img.style.visibility = '';
        controller.onLoaded && controller.onLoaded(controller.img);
    };

    return controller;
};
