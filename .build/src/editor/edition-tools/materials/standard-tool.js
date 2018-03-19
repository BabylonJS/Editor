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
var StandardMaterialTool = /** @class */ (function (_super) {
    __extends(StandardMaterialTool, _super);
    function StandardMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'STANDARD-MATERIAL-TOOL';
        _this.tabName = 'Standard Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    StandardMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_1.StandardMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    StandardMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Diffuse
        var diffuse = this.tool.addFolder('Diffuse');
        diffuse.open();
        diffuse.add(this.object, 'linkEmissiveWithDiffuse').name('Link Emissive With Diffuse');
        diffuse.add(this.object, 'useAlphaFromDiffuseTexture').name('Use Alpha From Diffuse Texture');
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object).name('Diffuse Texture');
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        // Bump
        var bump = this.tool.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture', this.object).name('Bump Texture');
        bump.add(this.object, 'invertNormalMapX').name('Invert Normal Map X');
        bump.add(this.object, 'invertNormalMapY').name('Invert Normal Map Y');
        bump.add(this.object, 'useParallax').name('Use Parallax');
        bump.add(this.object, 'useParallaxOcclusion').name('Use Parallax Occlusion');
        bump.add(this.object, 'parallaxScaleBias').step(0.001).name('Parallax Scale Bias');
        // Specular
        var specular = this.tool.addFolder('Specular');
        specular.open();
        specular.add(this.object, 'specularPower').step(0.01).name('Specular Power');
        specular.add(this.object, 'useGlossinessFromSpecularMapAlpha').name('Use Glossiness From Specular Map Alpha');
        specular.add(this.object, 'useReflectionFresnelFromSpecular').name('Use Reflection Fresnel From Specular');
        specular.add(this.object, 'useSpecularOverAlpha').name('Use Specular Over Alpha');
        this.tool.addTexture(specular, this.editor, 'specularTexture', this.object).name('Specular Texture');
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();
        // Opacity
        var opacity = this.tool.addFolder('Opacity');
        opacity.open();
        this.tool.addTexture(opacity, this.editor, 'opacityTexture', this.object).name('Opacity Texture');
        // Emissive
        var emissive = this.tool.addFolder('Emissive');
        emissive.open();
        this.tool.addColor(emissive, 'Emissive', this.object.emissiveColor).open();
        emissive.add(this.object, 'useEmissiveAsIllumination').name('Use Emissive As Illumination');
        this.tool.addTexture(emissive, this.editor, 'emissiveTexture', this.object).name('Emissive Texture');
        // Ambient
        var ambient = this.tool.addFolder('Ambient');
        ambient.open();
        this.tool.addColor(ambient, 'Ambient', this.object.ambientColor).open();
        this.tool.addTexture(ambient, this.editor, 'ambientTexture', this.object).name('Ambient Texture');
        // Light map
        var lightmap = this.tool.addFolder('Lightmap');
        lightmap.open();
        lightmap.add(this.object, 'useLightmapAsShadowmap').name('Use Lightmap As Shadowmap');
        this.tool.addTexture(lightmap, this.editor, 'lightmapTexture', this.object).name('Lightmap Texture');
        // Reflection
        var reflection = this.tool.addFolder('Reflection');
        reflection.open();
        this.tool.addTexture(reflection, this.editor, 'reflectionTexture', this.object, true).name('Reflection Texture');
        // Refraction
        var refraction = this.tool.addFolder('Refraction');
        refraction.open();
        refraction.add(this.object, 'indexOfRefraction').name('Index of Refraction');
        refraction.add(this.object, 'invertRefractionY').name('Invert Y');
        this.tool.addTexture(refraction, this.editor, 'refractionTexture', this.object, true).name('Refraction Texture');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return StandardMaterialTool;
}(material_tool_1.default));
exports.default = StandardMaterialTool;
//# sourceMappingURL=standard-tool.js.map