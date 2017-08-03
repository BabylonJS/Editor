module BABYLON.EDITOR {
    export class CellMaterialTool extends AbstractMaterialTool<CellMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "CELL-MATERIAL", "Cell", "Cell");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof CellMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Texture", "diffuseTexture", diffuseFolder, false);

            // Cell
            var cellFolder = this._element.addFolder("Cell");
            cellFolder.add(this.material, "computeHighLevel").name("Compute Hight Level");

            // Finish
            return true;
        }
    }
}