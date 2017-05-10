declare module BABYLON.EDITOR {
    class GroundMeshTool extends AbstractMeshTool<GroundMesh> {
        private _subdivisions;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): boolean;
        private _propertyChanged();
    }
}
