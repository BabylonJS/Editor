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
var edition_tool_1 = require("./edition-tool");
var picker_1 = require("../gui/picker");
var RenderTargetTool = /** @class */ (function (_super) {
    __extends(RenderTargetTool, _super);
    function RenderTargetTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'RENDER-TARGET-TOOL';
        _this.tabName = 'Render Target';
        // Private members
        _this._renderTarget = null;
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    RenderTargetTool.prototype.isSupported = function (object) {
        return (object instanceof babylonjs_1.Light && !!object.getShadowGenerator()) || object instanceof babylonjs_1.RenderTargetTexture;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    RenderTargetTool.prototype.update = function (node) {
        _super.prototype.update.call(this, node);
        // Get render target
        this._renderTarget = node instanceof babylonjs_1.Light ? node.getShadowGenerator().getShadowMap() : node;
        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(this._renderTarget, 'refreshRate').min(0).step(1).name('Refresh Rate');
        // Render list
        var renderList = this.tool.addFolder('Render List');
        renderList.open();
        renderList.add(this._renderTarget, 'renderParticles').name('Render Particles');
        renderList.add(this._renderTarget, 'renderSprites').name('Render Sprites');
        renderList.add(this, '_setRenderList').name('Configure Render List...');
    };
    // Sets the render list of the render target
    RenderTargetTool.prototype._setRenderList = function () {
        var _this = this;
        var picker = new picker_1.default('Render List');
        picker.addItems(this.object.getScene().meshes);
        picker.addSelected(this._renderTarget.renderList);
        picker.open(function (selected) {
            var scene = _this._renderTarget.getScene();
            _this._renderTarget.renderList = [];
            selected.forEach(function (s) { return _this._renderTarget.renderList.push(scene.getMeshByName(s.name)); });
        });
    };
    return RenderTargetTool;
}(edition_tool_1.default));
exports.default = RenderTargetTool;
//# sourceMappingURL=render-target-tool.js.map