var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StandardMaterialTool = (function (_super) {
            __extends(StandardMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function StandardMaterialTool(editionTool) {
                _super.call(this, editionTool, "STANDARD-MATERIAL", "STANDARD", "Std Material");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.StandardMaterial; };
            }
            // Update
            StandardMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                this.material.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination || false;
                this.material.useReflectionFresnelFromSpecular = this.material.useReflectionFresnelFromSpecular || false;
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
            };
            return StandardMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.StandardMaterialTool = StandardMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
