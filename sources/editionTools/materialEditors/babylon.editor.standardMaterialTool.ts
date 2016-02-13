module BABYLON.EDITOR {
    export class StandardMaterialTool extends AbstractMaterialTool<StandardMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "STANDARD-MATERIAL", "STANDARD", "Std Material");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof StandardMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;

            // Values
            var valuesFolder = this._element.addFolder("Values");
            valuesFolder.add(this.material, "roughness").min(0).step(0.01).name("Roughness");
            valuesFolder.add(this.material, "specularPower").min(0).step(0.01).name("Specular Power");

            // Options
            var optionsFolder = this._element.addFolder("Options");
            optionsFolder.add(this.material, "useAlphaFromDiffuseTexture").name("Use Alpha From Diffuse Texture");
            optionsFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
            optionsFolder.add(this.material, "useGlossinessFromSpecularMapAlpha").name("Use Glossiness From Specular Map Alpha");
            optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
            optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
            optionsFolder.add(this.material, "useReflectionFresnelFromSpecular").name("Use Reflection Fresnel From Specular");
            optionsFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");

            // Colors
            var colorsFolder = this._element.addFolder("Colors");
            this.addColorFolder(this.material.ambientColor, "Ambient Color", true, colorsFolder);
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, colorsFolder);
            this.addColorFolder(this.material.specularColor, "Specular Color", true, colorsFolder);
            this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, colorsFolder);

            // Finish
            return true;
        }
    }
}