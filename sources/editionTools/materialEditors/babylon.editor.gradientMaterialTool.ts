module BABYLON.EDITOR {
    export class GradientMaterialTool extends AbstractMaterialTool<GradientMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "GRADIENT-MATERIAL", "GRADIENT", "Gradient");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof GradientMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Top
            var topFolder = this._element.addFolder("Top");
            this.addColorFolder(this.material.topColor, "Top Color", true, topFolder);
            topFolder.add(this.material, "topColorAlpha").min(0).max(1).step(0.01).name("Top Color Alpha");

            // Bottom
            var bottomFolder = this._element.addFolder("Bottom");
            this.addColorFolder(this.material.bottomColor, "Bottom Color", true, topFolder);
            topFolder.add(this.material, "bottomColorAlpha").min(0).max(1).step(0.01).name("Bottom Color Alpha");

            // Gradient
            var gradientFolder = this._element.addFolder("Gradient");
            gradientFolder.add(this.material, "offset").step(0.01).name("Offset");
            gradientFolder.add(this.material, "smoothness").step(0.01).name("Smoothness");

            // Finish
            return true;
        }
    }
}