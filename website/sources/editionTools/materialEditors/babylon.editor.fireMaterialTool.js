var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FireMaterialTool = (function (_super) {
            __extends(FireMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function FireMaterialTool(editionTool) {
                _super.call(this, editionTool, "FIRE-MATERIAL", "FIRE", "Fire");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.FireMaterial; };
            }
            // Update
            FireMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();
                // Fire
                var fireFolder = this._element.addFolder("Fire");
                fireFolder.add(this.material, "speed").min(0).step(0.01).name("Speed");
                this.addTextureButton("Distortion Texture", "distortionTexture", fireFolder).open();
                this.addTextureButton("Opacity Texture", "opacityTexture", fireFolder).open();
                // Finish
                return true;
            };
            return FireMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.FireMaterialTool = FireMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
