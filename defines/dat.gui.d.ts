declare module dat {

    /**
    * GUI creation
    */
    interface IGUIOptions {
        autoPlace?: boolean;
        width?: number | string;
    }

    interface IFolderCreator {
        /**
        * Adds a new folder
        */
        addFolder(name: string): IFolderElement;
    }

    /**
    * Creates a new dat.GUI object
    */
    class GUI implements IFolderCreator {
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
        height: number;

        /**
        * Adds a field
        */
        add(object: Object, propertyPath: string, items?: Array<string>): IGUIElement;

        /**
        * Adds a new folder
        */
        addFolder(name: string): IFolderElement;

        /**
        * Gets the domElement created by dat.gui
        */
        domElement: HTMLElement;
        /**
        * Remember initial object
        */
        remember(object: any): void;
    }

    interface IFolderElement extends IFolderCreator {
        /**
        * Adds a new element
        */
        add(object: Object, propertyPath: string, items?: Array<string>, name?: string): IGUIElement;
        /**
        * Adds a new color element
        */
        addColor(object: Object, propertyPath: string): IGUIElement;
        /**
        * Opens folder
        */
        open(): void;
        /**
        * Closes folder
        */
        close(): void;
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
        onChange(callback: (result?: any) => void): IGUIElement;

        /**
        * When change finished
        */
        onFinishChange(callback: (result?: any) => void): IGUIElement;

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

        /**
        * Listen the property
        */
        listen(): IGUIElement;
    }
}
