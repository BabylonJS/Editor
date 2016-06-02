var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SimpleMaterialTool = (function (_super) {
            __extends(SimpleMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SimpleMaterialTool(editionTool) {
                _super.call(this, editionTool, "SIMPLE-MATERIAL", "SIMPLE", "Simple");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.SimpleMaterial; };
            }
            // Update
            SimpleMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Add a simple element
                this._element.add(this.material, "name").name("Name");
                // Add a folder
                var diffuseFolder = this._element.addFolder("Diffuse");
                // Add color and texture elements with "diffuseFolder" as parent
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Diffuse Texture", "diffuseTexture", diffuseFolder).open();
                // Finish
                return true;
            };
            return SimpleMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.SimpleMaterialTool = SimpleMaterialTool;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterEditionTool(SimpleMaterialTool);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
