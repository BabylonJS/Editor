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
            pbrFolder.add(this.material, "cameraExposure").step(0.01).name("Camera Exposure");
            pbrFolder.add(this.material, "microSurface").min(0).step(0.01).name("Micro Surface");
            
            // Albedo
            var albedoFolder = this._element.addFolder("Albedo");
            this.addColorFolder(this.material.albedoColor, "Albedo Color", true, albedoFolder);
            albedoFolder.add(this.material, "directIntensity").step(0.01).name("Direct Intensity")
            albedoFolder.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");
            this.addTextureButton("Albedo Texture", "albedoTexture", albedoFolder);

            // Bump
            var bumpFolder = this._element.addFolder("Bump & Parallax");
            bumpFolder.open();
            bumpFolder.add(this.material, "useParallax").name("Use Parallax");
            bumpFolder.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
            bumpFolder.add(this.material, "parallaxScaleBias").step(0.001).name("Bias");
            this.addTextureButton("Bump Texture", "bumpTexture", bumpFolder);

            // Reflectivity
            var reflectivityFolder = this._element.addFolder("Reflectivity");
            this.addColorFolder(this.material.reflectivityColor, "Reflectivity Color", true, reflectivityFolder);
            reflectivityFolder.add(this.material, "specularIntensity").min(0).step(0.01).name("Specular Intensity");
            reflectivityFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
            this.addTextureButton("Reflectivity Texture", "reflectivityTexture", reflectivityFolder);

            // Reflection
            var reflectionFolder = this._element.addFolder("Reflection");
            this.addColorFolder(this.material.reflectionColor, "Reflection Color", true, reflectionFolder);
            reflectionFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
            this.addTextureButton("Reflection Texture", "reflectionTexture", reflectionFolder);

            // Emissive
            var emissiveFolder = this._element.addFolder("Emissive");
            this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, emissiveFolder);
            emissiveFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
            emissiveFolder.add(this.material, "linkEmissiveWithAlbedo").name("Link Emissive With Albedo");
            emissiveFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
            this.addTextureButton("Emissive Texture", "emissiveTexture", emissiveFolder);

            // Ambient
            var ambientFolder = this._element.addFolder("Ambient");
            this.addColorFolder(this.material.ambientColor, "Ambient Color", true, ambientFolder);
            this.addTextureButton("Ambient Texture", "ambientTexture", ambientFolder);

            // Options
            var optionsFolder = this._element.addFolder("Options");
            optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
            optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");

            // Debug
            var debugFolder = this._element.addFolder("Debug");
            debugFolder.add(this.material, "overloadedShadowIntensity").min(0).step(0.01).name("Shadow Intensity");
            debugFolder.add(this.material, "overloadedShadeIntensity").min(0).step(0.01).name("Shade Intensity");

            // Debug albedo
            albedoFolder = debugFolder.addFolder("Albedo Debug");
            this.addColorFolder(this.material.overloadedAlbedo, "Albedo Color", true, albedoFolder);
            albedoFolder.add(this.material, "overloadedAlbedoIntensity").min(0).step(0.01).name("Albedo Intensity");

            // Debug reflectivity
            reflectivityFolder = debugFolder.addFolder("Reflectivity Debug");
            this.addColorFolder(this.material.overloadedReflectivity, "Reflectivity Color", true, reflectivityFolder);
            reflectivityFolder.add(this.material, "overloadedReflectivityIntensity").min(0).step(0.01).name("Reflectivity Intensity");

            // Debug reflection
            reflectionFolder = debugFolder.addFolder("Reflection Debug");
            this.addColorFolder(this.material.overloadedReflection, "Reflection Color", true, reflectionFolder);
            reflectionFolder.add(this.material, "overloadedReflectionIntensity").min(0).step(0.01).name("Reflection Intensity");

            // Debug ambient
            ambientFolder = debugFolder.addFolder("Ambient Debug");
            this.addColorFolder(this.material.overloadedAmbient, "Reflection Color", true, ambientFolder);
            ambientFolder.add(this.material, "overloadedAmbientIntensity").min(0).step(0.01).name("Ambient Intensity");

            // Debug emissive
            emissiveFolder = debugFolder.addFolder("Emissive Debug");
            this.addColorFolder(this.material.overloadedEmissive, "Emissive Color", true, emissiveFolder);
            emissiveFolder.add(this.material, "overloadedEmissiveIntensity").min(0).step(0.01).name("Emissive Intensity");

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