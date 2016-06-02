module BABYLON.EDITOR {
    export class FireMaterialTool extends AbstractMaterialTool<FireMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "FIRE-MATERIAL", "FIRE", "Fire");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof FireMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();
            
            // Fire
            var fireFolder = this._element.addFolder("Fire");
            fireFolder.add(this.material, "speed").min(0).step(0.01).name("Speed");
            this.addTextureButton("Distortion Texture", "distortionTexture", fireFolder).open();
            this.addTextureButton("Opacity Texture", "opacityTexture", fireFolder).open();

            // Finish
            return true;
        }
    }
}