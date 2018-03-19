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
var spectorjs_1 = require("spectorjs");
var extension_1 = require("../extension");
var extensions_1 = require("../extensions");
var SpectorDebugExtension = /** @class */ (function (_super) {
    __extends(SpectorDebugExtension, _super);
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    function SpectorDebugExtension(scene) {
        var _this = _super.call(this, scene) || this;
        // Extension
        _this.alwaysApply = true;
        // Spector
        _this.spector = new spectorjs_1.Spector();
        return _this;
    }
    /**
     * On apply the extension
     */
    SpectorDebugExtension.prototype.onApply = function () {
        var canvas = this.scene.getEngine().getRenderingCanvas();
        this.spector.displayUI();
    };
    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    SpectorDebugExtension.prototype.onLoad = function () { };
    return SpectorDebugExtension;
}(extension_1.default));
exports.default = SpectorDebugExtension;
extensions_1.default.Register('SpectorDebug', SpectorDebugExtension);
//# sourceMappingURL=spector-debug.js.map