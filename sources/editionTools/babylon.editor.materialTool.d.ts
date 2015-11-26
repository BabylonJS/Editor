declare module BABYLON.EDITOR {
    class MaterialTool extends AbstractTool {
        object: Node;
        tab: string;
        private _element;
        private _forbiddenElements;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
        private _addNumberFields(folder, object);
        private _addColorFields(folder, object);
    }
}
