var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SkyMaterialTool = (function (_super) {
            __extends(SkyMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SkyMaterialTool(editionTool) {
                _super.call(this, editionTool, "SKY-MATERIAL", "SKY", "Sky");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.SkyMaterial; };
            }
            // Update
            SkyMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Begin here
                this._element.add(this.material, "inclination").step(0.01).name("Inclination");
                this._element.add(this.material, "azimuth").step(0.01).name("Azimuth");
                this._element.add(this.material, "luminance").step(0.01).name("Luminance");
                this._element.add(this.material, "turbidity").step(0.01).name("Turbidity");
                this._element.add(this.material, "mieCoefficient").step(0.0001).name("Mie Coefficient");
                this._element.add(this.material, "mieDirectionalG").step(0.01).name("Mie Coefficient G");
                this._element.add(this.material, "rayleigh").step(0.01).name("Reileigh Coefficient");
                // Finish
                return true;
            };
            return SkyMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.SkyMaterialTool = SkyMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
