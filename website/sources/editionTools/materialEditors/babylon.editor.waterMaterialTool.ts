module BABYLON.EDITOR {
    export class WaterMaterialTool extends AbstractMaterialTool<WaterMaterial> {
        // Public members

        // Private members
        private _rtsEnabled: boolean;

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "WATER-MATERIAL", "WATER", "Water");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof WaterMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Colors
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true);
            this.addColorFolder(this.material.specularColor, "Specular Color", true);

            // Bump
            var bumpFolder = this._element.addFolder("Bump");
            bumpFolder.add(this.material, "bumpHeight").min(0.0).step(0.01).name("Bump Height");
            this.addTextureButton("Texture", "bumpTexture", bumpFolder);

            // Wind
            var windFolder = this._element.addFolder("Wind");
            windFolder.add(this.material, "windForce").min(0.0).step(0.01).name("Wind Force");
            this.addVectorFolder(this.material.windDirection, "Wind Direction", true, windFolder);

            // Waves
            var waveFolder = this._element.addFolder("Waves");
            waveFolder.add(this.material, "waveHeight").min(0.0).step(0.01).name("Wave Height");
            waveFolder.add(this.material, "waveLength").min(0.0).step(0.01).name("Wave Length");
            waveFolder.add(this.material, "waveSpeed").min(0.0).step(0.01).name("Wave Speed");

            // Color
            var colorFolder = this._element.addFolder("Color");
            colorFolder.add(this.material, "colorBlendFactor").min(0.0).max(1.0).step(0.01).name("Blend Factor");
            this.addColorFolder(this.material.waterColor, "Water Color", true, colorFolder);

            // Render
            this._rtsEnabled = this.material.renderTargetsEnabled;

            var renderFolder = this._element.addFolder("Reflection & Refraction");
            renderFolder.add(this, "_rtsEnabled").name("Enable Reflection & Refraction").onChange((result: any) => {
                this.material.enableRenderTargets(result);
            });
            renderFolder.add(this, "_configureReflection").name("Render...");

            // Finish
            return true;
        }

        // Configure rendering
        private _configureReflection(): void {
            var scene = this.material.getScene();
            var renderList = this.material.getRenderList();

            var picker = new ObjectPicker(this._editionTool.core);
            picker.objectLists.push(scene.meshes);

            picker.selectedObjects = this.material.getRenderList();
            picker.minSelectCount = 0;

            picker.open();

            picker.onObjectPicked = (names: string[]) => {
                this.material.reflectionTexture.renderList = [];
                this.material.refractionTexture.renderList = [];

                for (var i = 0; i < names.length; i++) {
                    var mesh: AbstractMesh = scene.getMeshByName(names[i]);

                    if (!mesh)
                        continue;

                    this.material.addToRenderList(mesh);
                }
            };
        }
    }
}