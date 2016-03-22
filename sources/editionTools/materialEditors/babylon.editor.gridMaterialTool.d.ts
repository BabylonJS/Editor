declare module BABYLON.EDITOR {
    class GridMaterialTool extends AbstractMaterialTool<GridMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
