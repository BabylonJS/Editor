var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GradientMaterialTool = (function (_super) {
            __extends(GradientMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GradientMaterialTool(editionTool) {
                _super.call(this, editionTool, "GRADIENT-MATERIAL", "GRADIENT", "Gradient");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.GradientMaterial; };
            }
            // Update
            GradientMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Top
                var topFolder = this._element.addFolder("Top");
                this.addColorFolder(this.material.topColor, "Top Color", true, topFolder);
                topFolder.add(this.material, "topColorAlpha").min(0).max(1).step(0.01).name("Top Color Alpha");
                // Bottom
                var bottomFolder = this._element.addFolder("Bottom");
                this.addColorFolder(this.material.bottomColor, "Bottom Color", true, topFolder);
                topFolder.add(this.material, "bottomColorAlpha").min(0).max(1).step(0.01).name("Bottom Color Alpha");
                // Gradient
                var gradientFolder = this._element.addFolder("Gradient");
                gradientFolder.add(this.material, "offset").step(0.01).name("Offset");
                gradientFolder.add(this.material, "smoothness").step(0.01).name("Smoothness");
                // Finish
                return true;
            };
            return GradientMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.GradientMaterialTool = GradientMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
