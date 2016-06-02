module BABYLON.EDITOR {
    export class TriPlanarMaterialTool extends AbstractMaterialTool<TriPlanarMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "TRI-PLANAR-MATERIAL", "TRI-PLANAR", "Tri Planar");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof TriPlanarMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Tri Planar
            this._element.add(this.material, "tileSize").min(0).step(0.01).name("Tile Size");

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Diffuse Texture X", "diffuseTextureX", diffuseFolder).open();
            this.addTextureButton("Diffuse Texture Y", "diffuseTextureY", diffuseFolder).open();
            this.addTextureButton("Diffuse Texture Z", "diffuseTextureZ", diffuseFolder).open();

            // Bump
            var bumpFolder = this._element.addFolder("Bump");
            this.addTextureButton("Bump Texture X", "normalTextureX", bumpFolder).open();
            this.addTextureButton("Bump Texture Y", "normalTextureY", bumpFolder).open();
            this.addTextureButton("Bump Texture Z", "normalTextureZ", bumpFolder).open();

            // Specular
            var specularFolder = this._element.addFolder("Specular");
            this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
            specularFolder.add(this.material, "specularPower").min(0).step(0.5).name("Specular Power");

            // Finish
            return true;
        }
    }
}