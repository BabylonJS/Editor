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
var TextureTool = /** @class */ (function (_super) {
    __extends(TextureTool, _super);
    function TextureTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'TEXTURE-TOOL';
        _this.tabName = 'Texture';
        // Private members
        _this._currentCoordinatesMode = '';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    TextureTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.BaseTexture;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    TextureTool.prototype.update = function (texture) {
        _super.prototype.update.call(this, texture);
        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(texture, 'invertZ').name('Invert Z');
        common.add(texture, 'hasAlpha').name('Has Alpha');
        common.add(texture, 'gammaSpace').name('Gamma Space');
        common.add(texture, 'getAlphaFromRGB').name('Get Alpha From RGB');
        var coordinates = [
            'EXPLICIT_MODE',
            'SPHERICAL_MODE',
            'PLANAR_MODE',
            'CUBIC_MODE',
            'PROJECTION_MODE',
            'SKYBOX_MODE',
            'INVCUBIC_MODE',
            'EQUIRECTANGULAR_MODE',
            'FIXED_EQUIRECTANGULAR_MODE',
            'FIXED_EQUIRECTANGULAR_MIRRORED_MODE'
        ];
        this._currentCoordinatesMode = coordinates[texture.coordinatesMode];
        common.add(this, '_currentCoordinatesMode', coordinates).name('Coordinates Mode').onFinishChange(function (r) {
            texture.coordinatesMode = babylonjs_1.Texture[r];
        });
        // Texture
        if (texture instanceof babylonjs_1.Texture) {
            var tex = this.tool.addFolder('Texture');
            tex.open();
            tex.add(texture, 'vScale').step(0.01).name('V Scale');
            tex.add(texture, 'uScale').step(0.01).name('U Scale');
        }
        else if (texture instanceof babylonjs_1.CubeTexture) {
            // TODO
        }
    };
    return TextureTool;
}(edition_tool_1.default));
exports.default = TextureTool;
//# sourceMappingURL=texture-tool.js.map