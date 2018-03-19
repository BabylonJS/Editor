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
var TerrainMaterialTool = /** @class */ (function (_super) {
    __extends(TerrainMaterialTool, _super);
    function TerrainMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'TERRAIN-MATERIAL-TOOL';
        _this.tabName = 'Terrain Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    TerrainMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.TerrainMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    TerrainMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Tri planar
        var terrain = this.tool.addFolder('Terrain');
        terrain.open();
        this.tool.addTexture(terrain, this.editor, 'mixTexture', this.object, false).name('Mix Texture');
        // Diffuse
        var diffuse = terrain.addFolder('Diffuse');
        diffuse.open();
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture1', this.object, false).name('Diffuse Texture R');
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture2', this.object, false).name('Diffuse Texture G');
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture3', this.object, false).name('Diffuse Texture B');
        // Bump
        var bump = terrain.addFolder('Bump');
        bump.open();
        this.tool.addTexture(bump, this.editor, 'bumpTexture1', this.object, false).name('Bump Texture R');
        this.tool.addTexture(bump, this.editor, 'bumpTexture2', this.object, false).name('Bump Texture G');
        this.tool.addTexture(bump, this.editor, 'bumpTexture3', this.object, false).name('Bump Texture B');
        // Specular
        var specular = terrain.addFolder('Specular');
        specular.open();
        this.tool.addColor(specular, 'Color', this.object.specularColor).open();
        specular.add(this.object, 'specularPower').min(0).step(0.5).name('Specular Power');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return TerrainMaterialTool;
}(material_tool_1.default));
exports.default = TerrainMaterialTool;
//# sourceMappingURL=terrain-tool.js.map