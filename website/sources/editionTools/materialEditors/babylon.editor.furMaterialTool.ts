module BABYLON.EDITOR {
    export class FurMaterialTool extends AbstractMaterialTool<FurMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "FUR-MATERIAL", "FUR", "Fur");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof FurMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            var callback = () => {
                this.material.updateFur();
            };

            // Diffuse
            var diffuseFolder = this._element.addFolder("Diffuse");
            this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder, callback);
            this.addTextureButton("Texture", "diffuseTexture", diffuseFolder, callback);

            // Fur
            var furFolder = this._element.addFolder("Fur");
            this.addColorFolder(this.material.furColor, "Fur Color", true, furFolder, callback);
            furFolder.add(this.material, "furLength").min(0).step(0.1).name("Fur Length").onChange((result: any) => { callback(); });
            furFolder.add(this.material, "furAngle").min(0).step(0.1).name("Fur Angle").onChange((result: any) => { callback(); });
            furFolder.add(this.material, "furSpacing").min(0).step(0.1).name("Fur Spacing").onChange((result: any) => { callback(); });
            furFolder.add(this.material, "furSpeed").min(1).max(1000).step(0.01).name("Fur Speed").onChange((result: any) => { callback(); });
            furFolder.add(this.material, "furDensity").min(0).step(0.1).name("Fur Density").onChange((result: any) => { callback(); });
            furFolder.add(this.material, "highLevelFur").name("High Level Fur").onChange((result: any) => { callback(); });
            this.addVectorFolder(this.material.furGravity, "Gravity", true, furFolder, callback);

            // Finish
            return true;
        }
    }
}