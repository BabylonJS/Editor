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
var FireMaterialTool = /** @class */ (function (_super) {
    __extends(FireMaterialTool, _super);
    function FireMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'FIRE-MATERIAL-TOOL';
        _this.tabName = 'Fire Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    FireMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.FireMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    FireMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Diffuse
        var diffuse = this.tool.addFolder('Diffuse');
        diffuse.open();
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object, false).name('Texture');
        // Fire
        var fire = this.tool.addFolder('Fire');
        fire.open();
        fire.add(this.object, 'speed').min(0).step(0.01).name('Speed');
        this.tool.addTexture(fire, this.editor, 'distortionTexture', this.object, false).name('Distortion');
        this.tool.addTexture(fire, this.editor, 'opacityTexture', this.object, false).name('Opacity');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return FireMaterialTool;
}(material_tool_1.default));
exports.default = FireMaterialTool;
//# sourceMappingURL=fire-tool.js.map