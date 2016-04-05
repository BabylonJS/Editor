declare module BABYLON.EDITOR {
    class FireMaterialTool extends AbstractMaterialTool<FireMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
