declare module BABYLON.EDITOR {
    class MaterialTool extends AbstractDatTool {
        tab: string;
        private _dummyProperty;
        private _libraryDummyProperty;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _configureMaterialsLibrary(folder);
        private _applyMaterial();
        private _removeMaterial();
        private _setMaterialsLibrary();
    }
}
