var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PBRMaterialTool = (function (_super) {
            __extends(PBRMaterialTool, _super);
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PBRMaterialTool(editionTool) {
                _super.call(this, editionTool, "PBR-MATERIAL", "PBR", "PBR");
                // Public members
                // Private members
                this._dummyPreset = "None";
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.PBRMaterial; };
            }
            // Update
            PBRMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                // Presets
                var presets = [
                    this._dummyPreset,
                    "Glass",
                    "Metal",
                    "Plastic",
                    "Wood"
                ];
                this._element.add(this, "_dummyPreset", presets, "Preset :").onChange(function (result) {
                });
                // PBR
                var pbrFolder = this._element.addFolder("PBR");
                pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
                pbrFolder.add(this.material, "directIntensity").step(0.01).name("Direct Intensity");
                pbrFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
                pbrFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
                pbrFolder.add(this.material, "cameraExposure").step(0.01).name("Camera Exposure");
                pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
                // Values
                var valuesFolder = this._element.addFolder("Values");
                valuesFolder.add(this.material, "glossiness").min(0).step(0.01).name("Glossiness");
                valuesFolder.add(this.material, "specularIntensity").min(0).step(0.01).name("Specular Intensity");
                // Overloaded values
                var overloadedFolder = this._element.addFolder("Overloaded Values");
                overloadedFolder.add(this.material, "overloadedAmbientIntensity").min(0).step(0.01).name("Ambient Intensity");
                overloadedFolder.add(this.material, "overloadedAlbedoIntensity").min(0).step(0.01).name("Albedo Intensity");
                overloadedFolder.add(this.material, "overloadedEmissiveIntensity").min(0).step(0.01).name("Emissive Intensity");
                overloadedFolder.add(this.material, "overloadedReflectionIntensity").min(0).step(0.01).name("Reflection Intensity");
                overloadedFolder.add(this.material, "overloadedShadowIntensity").min(0).step(0.01).name("Shadow Intensity");
                overloadedFolder.add(this.material, "overloadedShadeIntensity").min(0).step(0.01).name("Shade Intensity");
                // Overloaded colors
                var overloadedColorsFolder = this._element.addFolder("Overloaded Colors");
                this.addColorFolder(this.material.overloadedAmbient, "Ambient Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedAlbedo, "Diffuse Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedReflectivity, "Specular Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedEmissive, "Emissive Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedReflection, "Reflection Color", false, overloadedColorsFolder);
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "linkRefractionWithTransparency").name("Link Refraction With Transparency");
                optionsFolder.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");
                optionsFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
                optionsFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, colorsFolder);
                this.addColorFolder(this.material.albedoColor, "Albedo Color", true, colorsFolder);
                this.addColorFolder(this.material.reflectivityColor, "Reflectivity Color", true, colorsFolder);
                this.addColorFolder(this.material.reflectionColor, "Reflection Color", true, colorsFolder);
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, colorsFolder);
                // Finish
                return true;
            };
            return PBRMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.PBRMaterialTool = PBRMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.pbrMaterialTool.js.map