declare module BABYLON.EDITOR {
    class LensFlareTool extends AbstractDatTool {
        tab: string;
        private _dummyProperty;
        private _currentLensFlareId;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _addLensFlare();
        private _reset();
        private _setupRemove(indice);
        private _setupChangeTexture(indice);
    }
}
