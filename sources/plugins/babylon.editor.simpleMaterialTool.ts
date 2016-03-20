module BABYLON.EDITOR {
    export class SimpleMaterialTool extends AbstractMaterialTool<SimpleMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "SIMPLE-MATERIAL", "SIMPLE", "Simple");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof SimpleMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Begin here
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true);
            this.addTextureButton("Diffuse Texture", "diffuseTexture").open();

            // Finish
            return true;
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterEditionTool(SimpleMaterialTool);
}