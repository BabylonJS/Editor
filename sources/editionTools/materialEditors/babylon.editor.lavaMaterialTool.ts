module BABYLON.EDITOR {
    export class LavaMaterialTool extends AbstractMaterialTool<LavaMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "LAVA-MATERIAL", "LAVA", "Lava");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof LavaMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Texture", "diffuseTexture", diffuseFolder);

            // Lava
            var lavaFolder = this._element.addFolder("Lava");
            this.addTextureButton("Noise Texture", "noiseTexture", lavaFolder);
            lavaFolder.add(this.material, "movingSpeed").min(0).name("Moving Speed");
            lavaFolder.add(this.material, "lowFrequencySpeed").min(0).name("Low Frequency Speed");

            // Fog
            var fogFolder = this._element.addFolder("Fog");
            this.addColorFolder(this.material.fogColor, "Fog Color", true, fogFolder);
            fogFolder.add(this.material, "fogDensity").min(0).name("Fog Density");

            // Finish
            return true;
        }
    }
}