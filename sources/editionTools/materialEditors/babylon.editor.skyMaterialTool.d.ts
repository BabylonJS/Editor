declare module BABYLON.EDITOR {
    class SkyMaterialTool extends AbstractMaterialTool<SkyMaterial> {
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
    }
}
