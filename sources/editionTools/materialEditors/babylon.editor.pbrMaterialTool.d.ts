declare module BABYLON.EDITOR {
    class PBRMaterialTool extends AbstractMaterialTool<PBRMaterial> {
        private _dummyPreset;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _createPresetGlass();
        private _createPresetMetal();
        private _createPresetPlastic();
        private _createPresetWood();
    }
}
