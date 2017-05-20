var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var CellMaterialTool = (function (_super) {
            __extends(CellMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function CellMaterialTool(editionTool) {
                var _this = _super.call(this, editionTool, "CELL-MATERIAL", "Cell", "Cell") || this;
                // Initialize
                _this.onObjectSupported = function (material) { return material instanceof BABYLON.CellMaterial; };
                return _this;
            }
            // Update
            CellMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Diffuse
                var diffuseFolder = this._element.addFolder("Diffuse");
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, diffuseFolder);
                this.addTextureButton("Texture", "diffuseTexture", diffuseFolder, false);
                // Cell
                var cellFolder = this._element.addFolder("Cell");
                cellFolder.add(this.material, "computeHighLevel").name("Compute Hight Level");
                // Finish
                return true;
            };
            return CellMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.CellMaterialTool = CellMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.cellMaterialTool.js.map
