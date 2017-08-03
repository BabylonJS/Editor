module BABYLON.EDITOR {
    export class PBRMaterialTool extends AbstractMaterialTool<PBRMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "PBR-MATERIAL", "PBR", "PBR");

            // Initialize
            this.onObjectSupported = (material: Material) => {
                return material instanceof PBRMaterial
                    || material instanceof PBRMetallicRoughnessMaterial
                    || material instanceof PBRSpecularGlossinessMaterial
            };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Metallic Roughness
            if (this.material instanceof PBRMetallicRoughnessMaterial) {
                this.material.metallic = this.material.metallic || 0;
                this.material.roughness = this.material.roughness || 1;
                this.material.environmentIntensity = this.material.environmentIntensity || 1;

                var metallicFolder = this._element.addFolder("Metallic Roughness");
                metallicFolder.add(this.material, "metallic").step(0.01).name("Metallic");
                metallicFolder.add(this.material, "roughness").step(0.01).name("Roughness");
                metallicFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");

                this.addColorFolder(this.material.baseColor, "Base Color", true, metallicFolder);
                this.addTextureButton("Environment Texture", "environmentTexture", metallicFolder, true);
                this.addTextureButton("Base Texture", "baseTexture", metallicFolder);
            }
            // Specular Glossiness
            else if (this.material instanceof PBRSpecularGlossinessMaterial) {
                this.material.environmentIntensity = this.material.environmentIntensity || 1;

                var specGlosFolder = this._element.addFolder("Specular Glossiness");
                specGlosFolder.add(this.material, "glossiness").step(0.01).name("Glossiness");
                specGlosFolder.add(this.material, "occlusionStrength").step(0.01).name("Occlusion Strength");
                specGlosFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");

                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, specGlosFolder);
                this.addColorFolder(this.material.specularColor, "Specular Color", true, specGlosFolder);

                this.addTextureButton("Environment Texture", "environmentTexture", specGlosFolder, true);
                this.addTextureButton("Specular Glossiness Texture", "specularGlossinessTexture", specGlosFolder);
                this.addTextureButton("Occlusion Texture", "occlusionTexture", specGlosFolder);
            }
            // Full PBR
            else {
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
                bumpFolder.add(this, "_createNormalMapEditor").name("Create normal map from albedo texture...");
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
                this.addTextureButton("Reflection Texture", "reflectionTexture", reflectionFolder, true);
                reflectionFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
                reflectionFolder.add(this.material, "useRadianceOverAlpha").name("Radiance Over Alpha");

                // Metallic
                var metallicFolder = this._element.addFolder("Metallic");
                metallicFolder.add(this.material, "useMetallnessFromMetallicTextureBlue").name("Metallness From Metallic Texture Blue");
                metallicFolder.add(this.material, "useRoughnessFromMetallicTextureAlpha").name("Use Roughness From Metallic Texture Alpha");
                metallicFolder.add(this.material, "useRoughnessFromMetallicTextureGreen").name("Use Roughness From Metallic Texture Green");
                this.addTextureButton("Metallic Texture", "metallicTexture", metallicFolder, false);

                // Micro surface
                var microSurfaceFolder = this._element.addFolder("Micro Surface");
                this.addTextureButton("Micro Surface Texture", "microSurfaceTexture", microSurfaceFolder, false);
                microSurfaceFolder.add(this.material, "microSurface").step(0.01).name("Micro Surface");
                microSurfaceFolder.add(this.material, "useMicroSurfaceFromReflectivityMapAlpha").name("Use Micro Surface From Reflectivity Map Alpha");
                microSurfaceFolder.add(this.material, "useAutoMicroSurfaceFromReflectivityMap").name("Auto Micro Surface From Reflectivity Map");

                // Emissive
                var emissiveFolder = this._element.addFolder("Emissive");
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, emissiveFolder);
                emissiveFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
                this.addTextureButton("Emissive Texture", "emissiveTexture", emissiveFolder);

                // Ambient
                var ambientFolder = this._element.addFolder("Ambient");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, ambientFolder);
                this.addTextureButton("Ambient Texture", "ambientTexture", ambientFolder);
                ambientFolder.add(this.material, "ambientTextureStrength").step(0.01).name("Ambient Texture Strength");

                // Light Map
                var lightMapFolder = this._element.addFolder("Light Map");
                lightMapFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                this.addTextureButton("Light Map Texture", "lightmapTexture", lightMapFolder);

                // Refraction
                var refractionFolder = this._element.addFolder("Refraction");
                refractionFolder.add(this.material, "indexOfRefraction").name("Index of Refraction");
                refractionFolder.add(this.material, "linkRefractionWithTransparency").name("Index of Refraction");
                this.addTextureButton("Refraction Texture", "refractionTexture", refractionFolder, true);

                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
            }

            // Finish
            return true;
        }

        // Create normal map editor
        private _createNormalMapEditor(): void {
            if (!this.material.albedoTexture || !(this.material.albedoTexture instanceof Texture))
                return GUI.GUIWindow.CreateAlert("Please provide a diffuse texture first and/or use only basic texture", "Info");

            var editor = new NormalMapEditor(this._editionTool.core, <Texture>this.material.albedoTexture);
            editor.onApply = (texture) => {
                this.material.bumpTexture = texture;
            };
        }
    }
}