var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LavaMaterialTool = (function (_super) {
            __extends(LavaMaterialTool, _super);
            function LavaMaterialTool(editionTool) {
                _super.call(this, editionTool, "LAVA-MATERIAL", "LAVA", "Lava");
                this.onObjectSupported = function (material) { return material instanceof BABYLON.LavaMaterial; };
            }
            LavaMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Texture", "diffuseTexture", diffuseFolder);
                var lavaFolder = this._element.addFolder("Lava");
                this.addTextureButton("Noise Texture", "noiseTexture", lavaFolder);
                lavaFolder.add(this.material, "movingSpeed").min(0).name("Moving Speed");
                lavaFolder.add(this.material, "lowFrequencySpeed").min(0).name("Low Frequency Speed");
                var fogFolder = this._element.addFolder("Fog");
                this.addColorFolder(this.material.fogColor, "Fog Color", true, fogFolder);
                fogFolder.add(this.material, "fogDensity").min(0).name("Fog Density");
                return true;
            };
            return LavaMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.LavaMaterialTool = LavaMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
