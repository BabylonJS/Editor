module BABYLON.EDITOR {
    export class TerrainMaterialTool extends AbstractMaterialTool<TerrainMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "TERRAIN-MATERIAL", "TERRAIN", "Terrain");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof TerrainMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Mix Texture
            this.addTextureButton("Mix Texture", "mixTexture", null).open();

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Diffuse Texture R", "diffuseTexture1", diffuseFolder).open();
            this.addTextureButton("Diffuse Texture G", "diffuseTexture2", diffuseFolder).open();
            this.addTextureButton("Diffuse Texture B", "diffuseTexture3", diffuseFolder).open();

            // Bump
            var bumpFolder = this._element.addFolder("Bump");
            this.addTextureButton("Bump Texture R", "bumpTexture1", bumpFolder).open();
            this.addTextureButton("Bump Texture G", "bumpTexture2", bumpFolder).open();
            this.addTextureButton("Bump Texture B", "bumpTexture3", bumpFolder).open();

            // Specular
            var specularFolder = this._element.addFolder("Specular");
            this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
            specularFolder.add(this.material, "specularPower").min(0).step(0.5).name("Specular Power");

            // Finish
            return true;
        }
    }
}