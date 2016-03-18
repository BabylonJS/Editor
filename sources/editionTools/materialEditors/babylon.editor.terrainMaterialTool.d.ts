declare module BABYLON.EDITOR {
    class TerrainMaterialTool extends AbstractMaterialTool<TerrainMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
