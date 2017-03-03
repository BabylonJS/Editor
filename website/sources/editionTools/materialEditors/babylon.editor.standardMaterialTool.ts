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
            this.material.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination || false;
            this.material.useReflectionFresnelFromSpecular = this.material.useReflectionFresnelFromSpecular || false;

            // Values
            var valuesFolder = this._element.addFolder("Values");
            valuesFolder.add(this.material, "roughness").min(0).step(0.01).name("Roughness");

            // Options
            var optionsFolder = this._element.addFolder("Options");
            optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
            optionsFolder.add(this.material, "useReflectionFresnelFromSpecular").name("Use Reflection Fresnel From Specular");

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
            diffuseFolder.add(this.material, "useAlphaFromDiffuseTexture").name("Use Alpha From Diffuse Texture");
            this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder);
            
            // Bump
            var bumpFolder = this._element.addFolder("Bump & Parallax");
            bumpFolder.add(this.material, "useParallax").name("Use Parallax");
            bumpFolder.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
            bumpFolder.add(this.material, "parallaxScaleBias").step(0.001).name("Bias");
            bumpFolder.add(this, "_createNormalMapEditor").name("Create normal map...");
            this.addTextureButton("Bump Texture", "bumpTexture", bumpFolder);

            // Specular
            var specularFolder = this._element.addFolder("Specular");
            this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
            specularFolder.add(this.material, "specularPower").min(0).step(0.01).name("Specular Power");
            specularFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
            specularFolder.add(this.material, "useGlossinessFromSpecularMapAlpha").name("Use Glossiness From Specular Map Alpha");
            this.addTextureButton("Specular Texture", "specularTexture", specularFolder);

            // Opacity
            var opacityFolder = this.addTextureButton("Opacity Texture", "opacityTexture", null);
            opacityFolder.open();

            // Emissive
            var emissiveFolder = this._element.addFolder("Emissive");
            this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, emissiveFolder);
            emissiveFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
            this.addTextureButton("Emissive Texture", "emissiveTexture", emissiveFolder);

            // Ambient
            var ambientFolder = this._element.addFolder("Ambient");
            this.addColorFolder(this.material.ambientColor, "Ambient Color", true, ambientFolder);
            this.addTextureButton("Ambient Texture", "ambientTexture", ambientFolder);

            // Light Map
            var lightMapFolder = this._element.addFolder("Light Map");
            lightMapFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
            this.addTextureButton("Light Map Texture", "lightmapTexture", lightMapFolder);

            // Reflection
            var reflectionFolder = this._element.addFolder("Reflection");
            this.addTextureButton("Reflection Texture", "reflectionTexture", reflectionFolder, true);

            // Refraction
            var refractionFolder = this._element.addFolder("Refraction");
            refractionFolder.add(this.material, "indexOfRefraction").name("Index of Refraction");
            refractionFolder.add(this.material, "invertRefractionY").name("Invert Y");
            this.addTextureButton("Refraction Texture", "refractionTexture", refractionFolder, true);

            // Functions
            var functionsFolder = this._element.addFolder("Functions");
            functionsFolder.add(this, "_convertToPBR").name("Convert to PBR Material");

            // Finish
            return true;
        }

        // Create normal map editor
        private _createNormalMapEditor(): void {
            if (!this.material.diffuseTexture)
                return GUI.GUIWindow.CreateAlert("Please provide a diffuse texture first", "Info");

            var editor = new NormalMapEditor(this._editionTool.core, this.material, "diffuseTexture");
        }

        private _convertToPBR(): void {
            var pbr = new PBRMaterial(this.material.name + "_PBR", this._editionTool.core.currentScene);
            
            pbr.albedoColor = this.material.diffuseColor;
            pbr.albedoTexture = this.material.diffuseTexture;
            pbr.useAlphaFromAlbedoTexture = this.material.useAlphaFromDiffuseTexture;
            pbr.linkEmissiveWithAlbedo = this.material.linkEmissiveWithDiffuse;

            pbr.bumpTexture = this.material.bumpTexture;

            pbr.parallaxScaleBias = this.material.parallaxScaleBias;
            pbr.useParallax = this.material.useParallax;
            pbr.useParallaxOcclusion = this.material.useParallaxOcclusion;

            pbr.specularIntensity = this.material.specularPower;
            pbr.reflectivityColor = this.material.specularColor;
            pbr.reflectivityTexture = this.material.specularTexture;
            pbr.useSpecularOverAlpha = this.material.useSpecularOverAlpha;

            pbr.emissiveColor = this.material.emissiveColor;
            pbr.emissiveTexture = this.material.emissiveTexture;
            pbr.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination;
            pbr.emissiveFresnelParameters = this.material.emissiveFresnelParameters;

            pbr.indexOfRefraction = this.material.indexOfRefraction;
            pbr.invertRefractionY = this.material.invertRefractionY;
            pbr.refractionTexture = this.material.refractionTexture;

            pbr.reflectionTexture = this.material.reflectionTexture;
            
            pbr.opacityFresnelParameters = this.material.opacityFresnelParameters;
            pbr.opacityTexture = this.material.opacityTexture;

            pbr.ambientColor = this.material.ambientColor;
            pbr.ambientTexture = this.material.ambientTexture;

            if (this.object instanceof SubMesh) {
                var index = this.object.materialIndex;
                var multiMaterial = this.object.getMesh().material;
                if (multiMaterial instanceof MultiMaterial)
                    multiMaterial.subMaterials[index] = pbr;
            }
            else
                this.object.material = pbr;
            
            this._editionTool.updateEditionTool();
        }
    }
}