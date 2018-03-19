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
var TriPlanarMaterialTool = /** @class */ (function (_super) {
    __extends(TriPlanarMaterialTool, _super);
    function TriPlanarMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'TRI-PLANAR-MATERIAL-TOOL';
        _this.tabName = 'Tri Planar Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    TriPlanarMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.TriPlanarMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    TriPlanarMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Tri planar
        var triplanar = this.tool.addFolder('Tri Planar');
        triplanar.open();
        triplanar.add(this.object, 'tileSize').min(0).step(0.01).name('Tile Size');
        // Diffuse
        var diffuse = triplanar.addFolder('Diffuse');
        diffuse.open();
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTextureX', this.object, false).name('Diffuse Texture X');
        this.tool.addTexture(diffuse, this.editor, 'diffuseTextureY', this.object, false).name('Diffuse Texture Y');
        this.tool.addTexture(diffuse, this.editor, 'diffuseTextureZ', this.object, false).name('Diffuse Texture Z');
        // Bump
        var bump = triplanar.addFolder('Bump');
        bump.open();
        this.tool.addTexture(triplanar, this.editor, 'normalTextureX', this.object, false).name('Normal Texture X');
        this.tool.addTexture(triplanar, this.editor, 'normalTextureY', this.object, false).name('Normal Texture Y');
        this.tool.addTexture(triplanar, this.editor, 'normalTextureZ', this.object, false).name('Normal Texture Z');
        // Specular
        var specular = triplanar.addFolder('Specular');
        specular.open();
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').min(0).step(0.5).name('Specular Power');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return TriPlanarMaterialTool;
}(material_tool_1.default));
exports.default = TriPlanarMaterialTool;
//# sourceMappingURL=tri-planar-tool.js.map