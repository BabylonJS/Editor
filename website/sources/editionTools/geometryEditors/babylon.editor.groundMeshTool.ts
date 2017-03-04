module BABYLON.EDITOR {
    export class GroundMeshTool extends AbstractMeshTool<GroundMesh> {
        // Public members

        // Private members
        private _subdivisions: number = 0;

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "GROUND-MESH", "GROUND", "Ground");

            // Initialize
            this.onObjectSupported = (mesh: Mesh) => { return mesh instanceof GroundMesh };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Geometry
            this._subdivisions = this.mesh.subdivisions;

            var geometryFolder = this._element.addFolder("Geometry");
            geometryFolder.add(this.mesh, "_width").min(0.1).step(0.1).name("Width").onChange(() => this._propertyChanged());
            geometryFolder.add(this, "_subdivisions").min(1).max(1000).step(1).name("Subdivisions").onChange(() => this._propertyChanged());

            // Finish
            return true;
        }

        // Property changed
        private _propertyChanged(): void {
            this.mesh.geometry.setAllVerticesData(VertexData.CreateGround({
                width: this.mesh._width,
                height: this.mesh._width,
                subdivisions: this._subdivisions
            }));

            this.mesh._subdivisionsX = this.mesh._subdivisionsY = this._subdivisions
        }
    }
}