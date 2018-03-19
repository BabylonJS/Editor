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
var babylonjs_1 = require("babylonjs");
var material_tool_1 = require("./material-tool");
var CustomMaterialTool = /** @class */ (function (_super) {
    __extends(CustomMaterialTool, _super);
    function CustomMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'CUSTOM-MATERIAL-TOOL';
        _this.tabName = 'Custom Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    CustomMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object.getClassName && this.object.getClassName() === 'CustomMaterial';
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    CustomMaterialTool.prototype.update = function (object) {
        var _this = this;
        _super.prototype.update.call(this, object);
        this.setTabName('Custom Material');
        // Get current config of the post-process
        var config = this.object.config;
        // Base Color
        this.tool.addColor(this.tool.element, 'Base Color', this.object.baseColor).open();
        // Floats
        var floats = this.tool.addFolder('Floats');
        floats.open();
        config.floats.forEach(function (f) {
            if (_this.object.userConfig[f] === undefined)
                _this.object.userConfig[f] = 1;
            floats.add(_this.object.userConfig, f).step(0.01).name(f).onChange(function () { return _this.object.markAsDirty(babylonjs_1.Material.MiscDirtyFlag); });
        });
        // Vectors
        var vectors = this.tool.addFolder('Vectors');
        vectors.open();
        config.vectors2.forEach(function (v) {
            if (!_this.object.userConfig[v] || !(_this.object.userConfig[v] instanceof babylonjs_1.Vector2))
                _this.object.userConfig[v] = babylonjs_1.Vector2.Zero();
            _this.tool.addVector(vectors, v, _this.object.userConfig[v], function () { return _this.object.markAsDirty(babylonjs_1.Material.MiscDirtyFlag); }).open();
        });
        config.vectors3.forEach(function (v) {
            if (!_this.object.userConfig[v] || !(_this.object.userConfig[v] instanceof babylonjs_1.Vector3))
                _this.object.userConfig[v] = babylonjs_1.Vector3.Zero();
            _this.tool.addVector(vectors, v, _this.object.userConfig[v], function () { return _this.object.markAsDirty(babylonjs_1.Material.MiscDirtyFlag); }).open();
        });
        // Samplers
        var samplers = this.tool.addFolder('Samplers');
        samplers.open();
        config.textures.forEach(function (t) {
            _this.tool.addTexture(samplers, _this.editor, t.name, _this.object.userConfig, false, false, function () { return _this.object.markAsDirty(babylonjs_1.Material.TextureDirtyFlag); }).name(t.name);
        });
        // Options
        _super.prototype.addOptions.call(this);
    };
    return CustomMaterialTool;
}(material_tool_1.default));
exports.default = CustomMaterialTool;
//# sourceMappingURL=custom-tool.js.map