"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_materials_1 = require("babylonjs-materials");
var material_tool_1 = require("./material-tool");
var CellMaterialTool = /** @class */ (function (_super) {
    __extends(CellMaterialTool, _super);
    function CellMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'GRID-MATERIAL-TOOL';
        _this.tabName = 'Grid Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    CellMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.GridMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    CellMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Grid
        var grid = this.tool.addFolder('Fire');
        grid.open();
        this.tool.addColor(grid, 'Main Color', this.object.mainColor).open();
        this.tool.addColor(grid, 'Line Color', this.object.lineColor).open();
        grid.add(this.object, 'gridRatio').step(0.1).name('Grid Ratio');
        grid.add(this.object, 'opacity').min(0).step(0.01).name('Opacity');
        grid.add(this.object, 'majorUnitFrequency').name('Major Unit Frequency');
        grid.add(this.object, 'minorUnitVisibility').name('Minor Unit Visibility');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return CellMaterialTool;
}(material_tool_1.default));
exports.default = CellMaterialTool;
//# sourceMappingURL=grid-tool.js.map