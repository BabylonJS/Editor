module BABYLON.EDITOR {
    export class PBRMaterialTool extends AbstractMaterialTool<PBRMaterial> {
        // Public members

        // Private members
        private _dummyPreset: string = "";

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "PBR-MATERIAL", "PBR", "PBR");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof PBRMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;

            // Presets
            this._dummyPreset = "None";
            var presets = [
                this._dummyPreset,
                "Glass",
                "Metal",
                "Plastic",
                "Wood"
            ];
            this._element.add(this, "_dummyPreset", presets, "Preset :").onChange((result: any) => {
                if (this["_createPreset" + result]) {
                    this["_createPreset" + result]();
                    this.update();
                }
            });

            // PBR
            var pbrFolder = this._element.addFolder("PBR");
            pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
            pbrFolder.add(this.material, "directIntensity").step(0.01).name("Direct Intensity")
            pbrFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
            pbrFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
            pbrFolder.add(this.material, "cameraExposure").step(0.01).name("Camera Exposure");
            pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
            pbrFolder.add(this.material, "specularIntensity").min(0).step(0.01).name("Specular Intensity");
            pbrFolder.add(this.material, "microSurface").min(0).step(0.01).name("Micro Surface");

            // Debug values
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
            this.addColorFolder(this.material.overloadedAlbedo, "Albedo Color", false, overloadedColorsFolder);
            this.addColorFolder(this.material.overloadedReflectivity, "Reflectivity Color", false, overloadedColorsFolder);
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
        }

        // Preset for glass
        private _createPresetGlass(): void {
            this.material.linkRefractionWithTransparency = true;
            this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
            this.material.indexOfRefraction = 0.52;
            this.material.alpha = 0;
            this.material.directIntensity = 0.0;
            this.material.environmentIntensity = 0.5;
            this.material.cameraExposure = 0.5;
            this.material.cameraContrast = 1.7;
            this.material.microSurface = 1;
        }

        // Preset for metal
        private _createPresetMetal(): void {
            this.material.linkRefractionWithTransparency = false;
            this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
            this.material.directIntensity = 0.3;
            this.material.environmentIntensity = 0.7;
            this.material.cameraExposure = 0.55;
            this.material.cameraContrast = 1.6;
            this.material.microSurface = 0.96;
        }

        // Preset for Plastic
        private _createPresetPlastic(): void {
            this.material.linkRefractionWithTransparency = false;
            this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
            this.material.directIntensity = 0.6;
            this.material.environmentIntensity = 0.7;
            this.material.cameraExposure = 0.6;
            this.material.cameraContrast = 1.6;
            this.material.microSurface = 0.96;
        }

        // Preset for Wood
        private _createPresetWood(): void {
            this.material.linkRefractionWithTransparency = false;
            this.material.directIntensity = 1.5;
            this.material.environmentIntensity = 0.5;
            this.material.specularIntensity = 0.3;
            this.material.cameraExposure = 0.9;
            this.material.cameraContrast = 1.6;
            this.material.useMicroSurfaceFromReflectivityMapAlpha = true;
        }
    }
}