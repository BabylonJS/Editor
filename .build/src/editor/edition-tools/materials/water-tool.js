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
var WaterMaterialTool = /** @class */ (function (_super) {
    __extends(WaterMaterialTool, _super);
    function WaterMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'WATER-MATERIAL-TOOL';
        _this.tabName = 'Water Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    WaterMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.WaterMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    WaterMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Diffuse & Specular
        this.tool.addColor(this.tool.element, 'Diffuse', this.object.diffuseColor).open();
        var specular = this.tool.addFolder('Specular');
        specular.open();
        this.tool.addColor(specular, 'Specular', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').step(0.1).name('Specular Power');
        // Bump
        var bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object, false);
        bump.add(this.object, 'bumpHeight').min(0).max(10).step(0.001).name('Bump Height');
        // Wind
        var wind = this.tool.addFolder('Wind');
        wind.open();
        wind.add(this.object, 'windForce').min(0.0).step(0.01).name('Wind Force');
        this.tool.addVector(wind, 'Wind Direction', this.object.windDirection).open();
        ;
        // Waves
        var waves = this.tool.addFolder('Waves');
        waves.open();
        waves.add(this.object, 'waveHeight').min(0.0).step(0.01).name('Wave Height');
        waves.add(this.object, 'waveLength').min(0.0).step(0.01).name('Wave Length');
        waves.add(this.object, 'waveSpeed').min(0.0).step(0.01).name('Wave Speed');
        // Colors
        var colors = this.tool.addFolder('Colors');
        colors.open();
        this.tool.addColor(colors, 'Water Color 1', this.object.waterColor).open();
        colors.add(this.object, 'colorBlendFactor').min(0.0).max(1.0).step(0.01).name('Blend Factor 1');
        this.tool.addColor(colors, 'Water Color 2', this.object.waterColor2).open();
        colors.add(this.object, 'colorBlendFactor2').min(0.0).max(1.0).step(0.01).name('Blend Factor 2');
        // Advanced
        var advanced = this.tool.addFolder('Advanced');
        advanced.open();
        advanced.add(this.object, 'bumpSuperimpose').name('Bump Super Impose');
        advanced.add(this.object, 'bumpAffectsReflection').name('Bump Affects Reflection');
        advanced.add(this.object, 'fresnelSeparate').name('Fresnel Separate');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return WaterMaterialTool;
}(material_tool_1.default));
exports.default = WaterMaterialTool;
//# sourceMappingURL=water-tool.js.map