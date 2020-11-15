import { FactorGradient } from "babylonjs";

import * as dat from "dat.gui";
import { TextBoxController } from "./text-box";
import { ImageBoxController } from "./image";
import { SuggestController } from "./suggest";
import { CustomController } from "./custom";
import { ButtonController } from "./button";
import { KeyMapperController } from "./key-mapper";
import { VectorController, IVector } from "./vector";
import { ColorController, IColor } from "./color";
import { GradientController } from "./gradient";
import { SliderController } from "./slider";

import "./text-box";
import "./image";
import "./suggest";
import "./custom";
import "./button";
import "./key-mapper";
import "./vector";
import "./color";
import "./gradient";
import "./slider";

/**
 * Augmentify dat.gui
 */
declare module "dat.gui" {
    /**
     * Namespace containing the controllers.
     */
    export namespace controllers {
        /**
         * The main controller class.
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
            public constructor(object: any, property: string);

            /**
             * @hidden
             */
            public __li: HTMLLIElement;
            /**
             * @hidden
             */
            public __gui: dat.GUI;

            /**
             * Defines the path set using .setPath(...).
             * This path is used to know what property was modified by the inspector in the editor.
             */
            __path: string;
            /**
             * Sets the path of the property being modified by the controller. Especially useful for prefabs.
             * @param path the path of the property that is being modified by the controller.
             */
            public setPath(path: string): GUIController;

            /**
             * Defines the object being modified.
             */
            object: any;
            /**
             * Defines the property being modified in the object.
             */
            public property: string;
        }
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
        /**
         * Adds a new button.
         * @param text defines the title of the button.
         */
        addButton(text: string): ButtonController;
        /**
         * Adds a suggest box (input text).
         * @param object the object to modify.
         * @param property the property of the object tu get and set changes.
         * @param list the list of suggestions.
         * @param renderer optional callbacks called when rendering a suggestion item.
         */
        addSuggest(object: any, property: string, list?: string[], renderer?: {
            onShowLabel?: (item: string) => string | undefined;
			onShowIcon?: (item: string) => JSX.Element | undefined;
            onShowTooltip?: (item: string) => JSX.Element | undefined;
            onUpdate?: () => string[] | Promise<string[]>;
        }): SuggestController;
        /**
         * Adds a new keymapper input.
         * @param object the object to modify.
         * @param property the property of the object to get and set changes.
         */
        addKeyMapper(object: any, property: string): KeyMapperController;
        /**
         * Adds a custom element using react.
         * @param height the height expressed using css of the element (ex: 500px).
         * @param element the element to add in "this" folder.
         */
        addCustom(height: string, element: JSX.Element, style?: Partial<CSSStyleDeclaration>): CustomController;
        /**
         * Adds a new vector controller.
         * @param title the title of the controller.
         * @param vector the vector to modify.
         */
        addVector(title: string, vector: IVector): VectorController;
        /**
         * Adds a new advanced color controller.
         * @param title defines the title of the controller.
         * @param color defines the color to modify.
         */
        addAdvancedColor(title: string, color: IColor): ColorController;
        /**
         * Adds a new gradient controller.
         * @param title the title of the controller.
         * @param gradient the gradient to modify.
         */
        addGradient(title: string, gradient: FactorGradient): GradientController;
        /**
         * Adds a new slider controller.
         * @param object the object to modify.
         * @param property the property of the object to get and set changes.
         * @param min defines the minimum value of the slider.
         * @param max defines the maximum value of the slider.
         * @param step defines the step size of the slider.
         */
        addSlider(object: any, property: string, min: number, max: number, step: number): SliderController;
    }

    /**
     * GUI Controller class.
     */
    export interface GUIController {
        /**
         * Defines the path set using .setPath(...).
         * This path is used to know what property was modified by the inspector in the editor.
         */
        __path: string;
        /**
         * Sets the path of the base property being modified by the controller.
         * @param path the path of the base property.
         */
        setPath(path: string): GUIController;
        /**
         * Disposes the controller.
         */
        dispose?(): void;
    }
}

/**
 * Sets the path of the property being modified by the controller.
 */
dat.controllers.Controller.prototype.setPath = function(path: string): dat.GUIController {
    this.__path = path;
    return this;
}
