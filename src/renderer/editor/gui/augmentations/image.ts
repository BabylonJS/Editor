import * as dat from "dat.gui";

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
    constructor(url: string) {
        super({ property: "property" }, "property");

        this.img = document.createElement("img");
        this.img.src = url;

        this.domElement.appendChild(this.img);
    }

    /**
     * Sets the Url of the image.
     * @param url the url of the image to laod.
     */
    public setUrl(url: string): void {
        this.img.src = url;
    }
}

dat.GUI.prototype.addImage = function (url: string): ImageBoxController {
    // Create controller
    const controller = new ImageBoxController(url);

    // Create li element
    const li = document.createElement("li");
    li.appendChild(controller.domElement);

    this.__ul.appendChild(li);

    // Finish
    this.onResize();
    controller.__li = li;
    controller.__gui = this;
    this.__controllers.push(controller);

    li.style.marginLeft = "auto";
    li.style.marginRight = "auto";
    li.style.height = "0px";
    controller.img.style.visibility = "hidden";

    controller.img.onerror = () => {
        li.style.height = "0px";
        controller.onError && controller.onError(controller.img);
    };
    controller.img.onload = () => {
        const ratio = Math.min(100 / controller.img.width, 100 / controller.img.height);
        if (!isNaN(ratio)) {
            if (controller.img.width > controller.img.height) {
                const width = (controller.img.width * ratio) + "px";
                controller.img.style.width = width;
                li.style.width = width;
                jQuery(li).animate({ height: width }, 300);
            } else {
                const height = (controller.img.height * ratio) + "px";
                controller.img.style.height = height;
                li.style.width = height;
                jQuery(li).animate({ height: height }, 300);
            }
        }

        controller.img.style.visibility = "";
        controller.onLoaded && controller.onLoaded(controller.img);
    };

    return controller;
};
