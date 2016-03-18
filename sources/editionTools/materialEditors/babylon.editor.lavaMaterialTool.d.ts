declare module BABYLON.EDITOR {
    class LavaMaterialTool extends AbstractMaterialTool<LavaMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
