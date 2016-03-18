declare module BABYLON.EDITOR {
    class FurMaterialTool extends AbstractMaterialTool<FurMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
