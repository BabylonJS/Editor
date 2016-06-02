module BABYLON.EDITOR {
    export class SkyMaterialTool extends AbstractMaterialTool<SkyMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "SKY-MATERIAL", "SKY", "Sky");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof SkyMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Begin here
            this._element.add(this.material, "inclination").step(0.01).name("Inclination");
            this._element.add(this.material, "azimuth").step(0.01).name("Azimuth");

            this._element.add(this.material, "luminance").step(0.01).name("Luminance");
            this._element.add(this.material, "turbidity").step(0.01).name("Turbidity");

            this._element.add(this.material, "mieCoefficient").step(0.0001).name("Mie Coefficient");
            this._element.add(this.material, "mieDirectionalG").step(0.01).name("Mie Coefficient G");
            
            this._element.add(this.material, "rayleigh").step(0.01).name("Reileigh Coefficient");

            // Finish
            return true;
        }
    }
}