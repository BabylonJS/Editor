declare module dat {

    interface IGUIOptions {
        autoPlace?: boolean;
        width?: number | string;
    }

    /**
    * Creates a new dat.GUI object
    */
    class GUI {
        /**
        * Constructor
        */
        constructor(options?: IGUIOptions);

        /**
        * Interface's width
        */
        width: number;
        
        /**
        * Interface's height
        */
        height: string;

        /**
        * Adds a field
        */
        add(object: Object, propertyPath: string): IGUIElement;

        /**
        * Adds a new folder
        */
        addFolder(name: string): IFolderElement;

        /**
        * Gets the domElement created by dat.gui
        */
        domElement: HTMLElement;
    }

    interface IFolderElement {
        /**
        * Adds a new element
        */
        add(object: Object, propertyPath: string): IGUIElement;

        destroy(): void;

        remove(): void;
    }

    /**
    * Element created thanks to GUI
    */
    interface IGUIElement {
        /**
        * Changes the name of the element
        */
        name(name: string): IGUIElement;

        /**
        * When the element changed
        */
        onchange(callback: () => void): IGUIElement;

        /**
        * Sets the minimum value
        */
        min(min: number): IGUIElement;

        /**
        * Sets the maximum value
        */
        max(max: number): IGUIElement;

        /**
        * Defines the step when using the cursor
        */
        step(step: number): IGUIElement;
    }
}
