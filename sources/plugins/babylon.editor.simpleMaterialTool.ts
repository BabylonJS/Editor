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

            // Add a simple element
            this._element.add(this.material, "name").name("Name");

            // Add a folder
            var diffuseFolder = this._element.addFolder("Diffuse");

            // Add color and texture elements with "diffuseFolder" as parent
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();

            // Finish
            return true;
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterEditionTool(SimpleMaterialTool);
}