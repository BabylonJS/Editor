declare module BABYLON.EDITOR {
    class MaterialTool extends AbstractTool {
        object: Node;
        tab: string;
        private _element;
        private _forbiddenElements;
        private _dummyProperty;
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
        private _addBooleanFields(folder, object);
        private _addColorFields(folder, object);
        private _addVectorFields(folder, object);
        private _convertToPBR();
    }
}
