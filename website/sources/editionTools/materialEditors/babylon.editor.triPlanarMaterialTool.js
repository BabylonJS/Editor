var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var TriPlanarMaterialTool = (function (_super) {
            __extends(TriPlanarMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function TriPlanarMaterialTool(editionTool) {
                _super.call(this, editionTool, "TRI-PLANAR-MATERIAL", "TRI-PLANAR", "Tri Planar");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.TriPlanarMaterial; };
            }
            // Update
            TriPlanarMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Tri Planar
                this._element.add(this.material, "tileSize").min(0).step(0.01).name("Tile Size");
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture X", "diffuseTextureX", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture Y", "diffuseTextureY", diffuseFolder).open();
                this.addTextureButton("Diffuse Texture Z", "diffuseTextureZ", diffuseFolder).open();
                // Bump
                var bumpFolder = this._element.addFolder("Bump");
                this.addTextureButton("Bump Texture X", "normalTextureX", bumpFolder).open();
                this.addTextureButton("Bump Texture Y", "normalTextureY", bumpFolder).open();
                this.addTextureButton("Bump Texture Z", "normalTextureZ", bumpFolder).open();
                // Specular
                var specularFolder = this._element.addFolder("Specular");
                this.addColorFolder(this.material.specularColor, "Specular Color", true, specularFolder);
                specularFolder.add(this.material, "specularPower").min(0).step(0.5).name("Specular Power");
                // Finish
                return true;
            };
            return TriPlanarMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.TriPlanarMaterialTool = TriPlanarMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
