declare module BABYLON.EDITOR {
    class GeneralTool extends AbstractTool {
        object: Node;
        tab: string;
        private _element;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
    }
}
