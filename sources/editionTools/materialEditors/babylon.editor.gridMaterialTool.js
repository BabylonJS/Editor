var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GridMaterialTool = (function (_super) {
            __extends(GridMaterialTool, _super);
            function GridMaterialTool(editionTool) {
                _super.call(this, editionTool, "GRID-MATERIAL", "GRID", "Grid");
                this.onObjectSupported = function (material) { return material instanceof BABYLON.GridMaterial; };
            }
            GridMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                this.addColorFolder(this.material.mainColor, "Main Color", true);
                this.addColorFolder(this.material.lineColor, "Line Color", true);
                this._element.add(this.material, "opacity").min(0).name("Opacity");
                this._element.add(this.material, "gridRatio").step(0.1).name("Grid Ratio");
                this._element.add(this.material, "majorUnitFrequency").name("Major Unit Frequency");
                this._element.add(this.material, "minorUnitVisibility").name("Minor Unit Frequency");
                return true;
            };
            return GridMaterialTool;
        }(EDITOR.AbstractMaterialTool));
        EDITOR.GridMaterialTool = GridMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
