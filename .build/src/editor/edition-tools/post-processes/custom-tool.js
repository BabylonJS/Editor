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
var edition_tool_1 = require("../edition-tool");
var CustomPostProcessTool = /** @class */ (function (_super) {
    __extends(CustomPostProcessTool, _super);
    function CustomPostProcessTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'CUSTOM-POST-PROCESS-TOOL';
        _this.tabName = 'Custom Post-Process';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    CustomPostProcessTool.prototype.isSupported = function (object) {
        return object.getClassName && object.getClassName() === 'PostProcessEditor';
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    CustomPostProcessTool.prototype.update = function (object) {
        var _this = this;
        _super.prototype.update.call(this, object);
        this.setTabName('Custom Post-Process');
        // Get current config of the post-process
        var config = this.object.config;
        // Floats
        var floats = this.tool.addFolder('Floats');
        floats.open();
        config.floats.forEach(function (f) {
            if (_this.object.userConfig[f] === undefined)
                _this.object.userConfig[f] = 1;
            floats.add(_this.object.userConfig, f).step(0.01).name(f);
        });
        // Vectors
        var vectors = this.tool.addFolder('Vectors');
        vectors.open();
        config.vectors2.forEach(function (v) {
            if (!_this.object.userConfig[v] || !(_this.object.userConfig[v] instanceof babylonjs_1.Vector2))
                _this.object.userConfig[v] = babylonjs_1.Vector2.Zero();
            _this.tool.addVector(vectors, v, _this.object.userConfig[v]).open();
        });
        config.vectors3.forEach(function (v) {
            if (!_this.object.userConfig[v] || !(_this.object.userConfig[v] instanceof babylonjs_1.Vector3))
                _this.object.userConfig[v] = babylonjs_1.Vector3.Zero();
            _this.tool.addVector(vectors, v, _this.object.userConfig[v]).open();
        });
        // Samplers
        var samplers = this.tool.addFolder('Samplers');
        samplers.open();
        config.textures.forEach(function (t) {
            _this.tool.addTexture(samplers, _this.editor, t, _this.object.userConfig, false, false).name(t);
        });
    };
    return CustomPostProcessTool;
}(edition_tool_1.default));
exports.default = CustomPostProcessTool;
//# sourceMappingURL=custom-tool.js.map