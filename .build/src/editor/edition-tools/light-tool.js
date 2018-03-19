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
var tools_1 = require("../tools/tools");
var LightTool = /** @class */ (function (_super) {
    __extends(LightTool, _super);
    function LightTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'LIGHT-TOOL';
        _this.tabName = 'Light';
        // Private members
        _this._generatesShadows = false;
        _this._shadowMapSize = '512';
        _this._darkness = 0;
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    LightTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Light;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    LightTool.prototype.update = function (light) {
        var _this = this;
        _super.prototype.update.call(this, light);
        _super.prototype.setTabName.call(this, tools_1.default.GetConstructorName(light).replace('Light', ''));
        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(light, 'intensity').min(0).step(0.01).name('Intensity');
        common.add(light, 'range').min(0).step(0.01).name('Range');
        common.add(light, 'radius').min(0).step(0.01).name('Radius');
        // Colors
        var colors = this.tool.addFolder('Colors');
        colors.open();
        this.tool.addColor(colors, 'Diffuse', light.diffuse).open();
        this.tool.addColor(colors, 'Specular', light.specular).open();
        // Spot
        if (light instanceof babylonjs_1.SpotLight) {
            var spot = this.tool.addFolder('Spot Light');
            spot.open();
            spot.add(light, 'angle').step(0.01).name('Angle');
            spot.add(light, 'exponent').step(0.01).name('Exponent');
        }
        // Shadows
        if (light instanceof babylonjs_1.DirectionalLight || light instanceof babylonjs_1.PointLight || light instanceof babylonjs_1.SpotLight) {
            var shadowGenerator_1 = light.getShadowGenerator();
            shadowGenerator_1 ? this._generatesShadows = true : this._generatesShadows = false;
            var shadows = this.tool.addFolder('Shadows');
            shadows.open();
            shadows.add(this, '_generatesShadows').name('Generate Shadows').onFinishChange(function (r) {
                if (!r)
                    light.getShadowGenerator().dispose();
                else {
                    var size = parseInt(_this._shadowMapSize);
                    new babylonjs_1.ShadowGenerator(size, light);
                }
                _this.editor.edition.setObject(light);
            });
            shadows.add(light, 'shadowEnabled').name('Enable Shadows');
            var sizes = [];
            var max = this.editor.core.engine.getCaps().maxTextureSize;
            var current = 8;
            while (current < max) {
                current <<= 1;
                sizes.push(current.toString());
            }
            shadows.add(this, '_shadowMapSize', sizes).name('Shadow Map Size').onFinishChange(function (r) { return shadowGenerator_1 && shadowGenerator_1.getShadowMap().resize(parseInt(r)); });
            if (shadowGenerator_1) {
                this._darkness = shadowGenerator_1.getDarkness();
                shadows.add(this, '_darkness').min(0).max(1).step(0.01).name('Darkness').onChange(function (r) { return shadowGenerator_1.setDarkness(r); });
                shadows.add(shadowGenerator_1, 'bias').min(0).max(1).step(0.0000001).name('Bias');
                shadows.add(shadowGenerator_1, 'blurBoxOffset').min(0).max(10).step(1).name('Blur Box Offset');
                shadows.add(shadowGenerator_1, 'blurScale').min(0).max(16).step(1).name('Blur Scale');
                shadows.add(shadowGenerator_1, 'useKernelBlur').name('Use Kernel Blur');
                shadows.add(shadowGenerator_1, 'blurKernel').min(0).max(512).step(1).name('Blur Kernel');
                shadows.add(shadowGenerator_1, 'usePoissonSampling').name('Use Poisson Sampling');
                shadows.add(shadowGenerator_1, 'useExponentialShadowMap').name('Use Exponential Shadow Map');
                shadows.add(shadowGenerator_1, 'useBlurExponentialShadowMap').name('Use Blur Exponential Shadow Map');
                shadows.add(shadowGenerator_1, 'useCloseExponentialShadowMap').name('Use Close Exponential Shadow Map');
                shadows.add(shadowGenerator_1, 'useBlurCloseExponentialShadowMap').name('Use Blur Close Exponential Shadow Map');
            }
        }
    };
    return LightTool;
}(edition_tool_1.default));
exports.default = LightTool;
//# sourceMappingURL=light-tool.js.map