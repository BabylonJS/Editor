declare module BABYLON.EDITOR {
    class StandardMaterialTool extends AbstractMaterialTool<StandardMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _createNormalMapEditor();
        private _convertToPBR();
    }
}
