module BABYLON.EDITOR {
    export class LightTool extends AbstractDatTool {
        // Public members
        public tab: string = "LIGHT.TAB";

        // Private members
        private _customShadowsGeneratorSize: number = 512;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-LIGHT"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Light)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Light" });
        }

        // Update
        public update(): boolean {
            var object: Light = this.object = this._editionTool.object;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Common
            var commonFolder = this._element.addFolder("Common");
            commonFolder.add(object, "intensity").name("Intensity").min(0.0);
            commonFolder.add(object, "range").name("Range").min(0.0);

            // Vectors
            if (object instanceof DirectionalLight) {
                var directionFolder = this._element.addFolder("Direction");
                directionFolder.add(object.direction, "x").step(0.1);
                directionFolder.add(object.direction, "y").step(0.1);
                directionFolder.add(object.direction, "z").step(0.1);
            }

            // Spot light
            if (object instanceof SpotLight) {
                var spotFolder = this._element.addFolder("Spot Light");
                spotFolder.add(object, "exponent").min(0.0).name("Exponent");
                spotFolder.add(object, "angle").min(0.0).name("Angle");
            }

            // Colors
            var colorsFolder = this._element.addFolder("Colors");

            if (object.diffuse) {
                var diffuseFolder = colorsFolder.addFolder("Diffuse Color");
                diffuseFolder.open();
                diffuseFolder.add(object.diffuse, "r").min(0.0).max(1.0).step(0.01);
                diffuseFolder.add(object.diffuse, "g").min(0.0).max(1.0).step(0.01);
                diffuseFolder.add(object.diffuse, "b").min(0.0).max(1.0).step(0.01);
            }

            if (object.specular) {
                var specularFolder = colorsFolder.addFolder("Specular Color");
                specularFolder.open();
                specularFolder.add(object.specular, "r").min(0.0).max(1.0).step(0.01);
                specularFolder.add(object.specular, "g").min(0.0).max(1.0).step(0.01);
                specularFolder.add(object.specular, "b").min(0.0).max(1.0).step(0.01);
            }

            // Shadows
            var shadowsFolder = this._element.addFolder("Shadows");
            var shadows = object.getShadowGenerator();
            if (shadows) {
                shadowsFolder.add(shadows, "useBlurVarianceShadowMap").name("Use Blur Variance Shadows Map").listen();
                shadowsFolder.add(shadows, "useVarianceShadowMap").name("Use Variance Shadow Map").listen();
                shadowsFolder.add(shadows, "usePoissonSampling").name("Use Poisson Sampling").listen();

                shadowsFolder.add(shadows, "_darkness").min(0.0).max(1.0).step(0.01).name("Darkness");
                shadowsFolder.add(shadows, "bias").name("Bias");

                shadowsFolder.add(shadows, "blurBoxOffset").min(0.0).max(10.0).step(1.0).name("Blur Box Offset");
                shadowsFolder.add(shadows, "blurScale").min(0.0).max(10.0).name("Blur Scale");

                shadowsFolder.add(this, "_removeShadowGenerator").name("Remove Shadows Generator");
            }
            else {
                if (!(object instanceof HemisphericLight)) {
                    shadowsFolder.add(this, "_createShadowsGenerator").name("Create Shadows Generator");
                    shadowsFolder.add(this, "_customShadowsGeneratorSize").min(0).name("Shadow Map Size");
                }
            }

            return true;
        }

        // Creates a new shadows generator
        private _createShadowsGenerator(): void {
            // Assume that object exists
            var object: IShadowLight = this.object = this._editionTool.object;
            
            // Shadows Generator
            var shadows = new ShadowGenerator(this._customShadowsGeneratorSize, object);
            Tags.EnableFor(shadows);
            Tags.AddTagsTo(shadows, "added");

            // Refresh UI
            this._editionTool.updateEditionTool();
        }

        // Removes a shadows generator
        private _removeShadowGenerator(): void {
            var object: Light = this.object = this._editionTool.object;

            // Shadows Generator
            var shadows = object.getShadowGenerator();
            if (shadows)
                shadows.dispose();

            object._shadowGenerator = null;

            this.update();
        }
    }
}