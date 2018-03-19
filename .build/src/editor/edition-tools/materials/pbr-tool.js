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
var PBRMaterialTool = /** @class */ (function (_super) {
    __extends(PBRMaterialTool, _super);
    function PBRMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'PBR-TOOL';
        _this.tabName = 'PBR Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    PBRMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_1.PBRMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    PBRMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Albedo
        var albedo = this.tool.addFolder('Albedo');
        albedo.open();
        this.tool.addTexture(albedo, this.editor, 'albedoTexture', this.object).name('Albedo Texture');
        this.tool.addColor(albedo, 'Color', this.object.albedoColor).open();
        // Bump
        var bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');
        // Reflectivity
        var reflectivity = this.tool.addFolder('Reflectivity');
        reflectivity.open();
        this.tool.addTexture(reflectivity, this.editor, 'reflectivityTexture', this.object).name('Reflectivity Texture');
        this.tool.addColor(reflectivity, 'Color', this.object.reflectivityColor).open();
        // Reflection
        var reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, 'reflectionTexture', this.object, true, true).name('Reflection Texture');
        this.tool.addColor(reflection, 'Color', this.object.reflectionColor).open();
        reflection.add(this.object, 'environmentIntensity').step(0.01).name('Environment Intensity');
        // Microsurface
        var micro = this.tool.addFolder('Micro Surface');
        micro.open();
        this.tool.addTexture(micro, this.editor, 'microSurfaceTexture', this.object, false).name('Micro Surface Texture');
        micro.add(this.object, 'microSurface').min(0).max(1).name('Micro Surface');
        micro.add(this.object, 'useAutoMicroSurfaceFromReflectivityMap').name('Use Auto Micro Surface From Reflectivity Map');
        micro.add(this.object, 'useMicroSurfaceFromReflectivityMapAlpha').name('Use Micro Surface From Reflectivity Map Alpha');
        // Metallic
        var metallic = this.tool.addFolder('Metallic');
        metallic.open();
        metallic.add(this.object, 'useMetallnessFromMetallicTextureBlue').name('Metallness From Metallic Texture Blue');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureAlpha').name('Use Roughness From Metallic Texture Alpha');
        metallic.add(this.object, 'useRoughnessFromMetallicTextureGreen').name('Use Roughness From Metallic Texture Green');
        this.tool.addTexture(metallic, this.editor, 'metallicTexture', this.object, false).name('Metallic Texture');
        // Emissive
        var emissive = this.tool.addFolder('Emissive');
        emissive.open();
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'emissiveIntensity').step(0.01).name('Emissive Intensity');
        this.tool.addTexture(emissive, this.editor, 'emissiveTexture', this.object).name('Emissive Texture');
        // Ambient
        var ambient = this.tool.addFolder('Ambient');
        ambient.open();
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, 'ambientTexture', this.object).name('Ambient Texture');
        ambient.add(this.object, 'ambientTextureStrength').step(0.01).name('Ambient Texture Strength');
        // Light map
        var lightmap = this.tool.addFolder('Lightmap');
        lightmap.open();
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, 'lightmapTexture', this.object).name('Lightmap Texture');
        // Refraction
        var refraction = this.tool.addFolder('Refraction');
        refraction.open();
        refraction.add(this.object, 'indexOfRefraction').step(0.01).name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        refraction.add(this.object, 'linkRefractionWithTransparency').name('Link Refraction With Transparency');
        this.tool.addTexture(refraction, this.editor, 'refractionTexture', this.object, true).name('Refraction Texture');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return PBRMaterialTool;
}(material_tool_1.default));
exports.default = PBRMaterialTool;
//# sourceMappingURL=pbr-tool.js.map