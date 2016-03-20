declare module BABYLON.EDITOR {
    class SimpleMaterialTool extends AbstractMaterialTool<SimpleMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
