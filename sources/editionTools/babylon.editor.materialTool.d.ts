declare module BABYLON.EDITOR {
    class MaterialTool extends AbstractDatTool {
        tab: string;
        private _dummyProperty;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _convertToPBR();
    }
}
