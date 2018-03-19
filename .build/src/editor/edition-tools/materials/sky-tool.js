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
var SkyMaterialTool = /** @class */ (function (_super) {
    __extends(SkyMaterialTool, _super);
    function SkyMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'SKY-MATERIAL-TOOL';
        _this.tabName = 'Sky Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    SkyMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.SkyMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    SkyMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Sky
        this.tool.add(this.object, 'inclination').step(0.01).name('Inclination');
        this.tool.add(this.object, 'azimuth').step(0.01).name('Azimuth');
        this.tool.add(this.object, 'luminance').step(0.01).name('Luminance');
        this.tool.add(this.object, 'turbidity').step(0.01).name('Turbidity');
        this.tool.add(this.object, 'mieCoefficient').step(0.0001).name('Mie Coefficient');
        this.tool.add(this.object, 'mieDirectionalG').step(0.01).name('Mie Coefficient G');
        this.tool.add(this.object, 'rayleigh').step(0.01).name('Reileigh Coefficient');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return SkyMaterialTool;
}(material_tool_1.default));
exports.default = SkyMaterialTool;
//# sourceMappingURL=sky-tool.js.map