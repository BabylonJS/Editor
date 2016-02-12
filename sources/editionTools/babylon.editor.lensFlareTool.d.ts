declare module BABYLON.EDITOR {
    class LensFlareTool extends AbstractDatTool {
        tab: string;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _addLensFlareFolder(lensFlare, indice);
        private _addLensFlare();
        private _reset();
        private _setupRemove(indice);
        private _setupChangeTexture(indice);
    }
}
