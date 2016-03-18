declare module BABYLON.EDITOR {
    class TriPlanarMaterialTool extends AbstractMaterialTool<TriPlanarMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
