module BABYLON.EDITOR {
    export class GridMaterialTool extends AbstractMaterialTool<GridMaterial> {
        // Public members

        // Private members

        // Protected members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool, "GRID-MATERIAL", "GRID", "Grid");

            // Initialize
            this.onObjectSupported = (material: Material) => { return material instanceof GridMaterial };
        }

        // Update
        public update(): boolean {

            if (!super.update())
                return false;

            // Colors
            this.addColorFolder(this.material.mainColor, "Main Color", true);
            this.addColorFolder(this.material.lineColor, "Line Color", true);
            this._element.add(this.material, "opacity").min(0).name("Opacity");

            this._element.add(this.material, "gridRatio").step(0.1).name("Grid Ratio");

            this._element.add(this.material, "majorUnitFrequency").name("Major Unit Frequency");
            this._element.add(this.material, "minorUnitVisibility").name("Minor Unit Frequency");

            // Finish
            return true;
        }
    }
}