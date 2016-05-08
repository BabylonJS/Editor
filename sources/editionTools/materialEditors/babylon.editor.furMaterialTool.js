var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FurMaterialTool = (function (_super) {
            __extends(FurMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function FurMaterialTool(editionTool) {
                _super.call(this, editionTool, "FUR-MATERIAL", "FUR", "Fur");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.FurMaterial; };
            }
            // Update
            FurMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                var callback = function () {
                    _this.material.updateFur();
                };
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder, callback);
                this.addTextureButton("Texture", "diffuseTexture", diffuseFolder, callback);
                // Fur
                var furFolder = this._element.addFolder("Fur");
                this.addColorFolder(this.material.furColor, "Fur Color", true, furFolder, callback);
                furFolder.add(this.material, "furLength").min(0).step(0.1).name("Fur Length").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furAngle").min(0).step(0.1).name("Fur Angle").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furSpacing").min(0).step(0.1).name("Fur Spacing").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furSpeed").min(1).max(1000).step(0.01).name("Fur Speed").onChange(function (result) { callback(); });
                furFolder.add(this.material, "furDensity").min(0).step(0.1).name("Fur Density").onChange(function (result) { callback(); });
                furFolder.add(this.material, "highLevelFur").name("High Level Fur").onChange(function (result) { callback(); });
                this.addVectorFolder(this.material.furGravity, "Gravity", true, furFolder, callback);
                // Finish
                return true;
            };
            return FurMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.FurMaterialTool = FurMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
