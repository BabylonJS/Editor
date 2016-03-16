declare module BABYLON.EDITOR {
    class WaterMaterialTool extends AbstractMaterialTool<WaterMaterial> {
        private _rtsEnabled;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _configureReflection();
    }
}
