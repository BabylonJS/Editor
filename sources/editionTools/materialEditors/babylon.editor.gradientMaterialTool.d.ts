declare module BABYLON.EDITOR {
    class GradientMaterialTool extends AbstractMaterialTool<GradientMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
