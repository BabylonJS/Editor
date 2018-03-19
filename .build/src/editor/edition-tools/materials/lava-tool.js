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
var LavaMaterialTool = /** @class */ (function (_super) {
    __extends(LavaMaterialTool, _super);
    function LavaMaterialTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'LAVA-MATERIAL-TOOL';
        _this.tabName = 'Lava Material';
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    LavaMaterialTool.prototype.isSupported = function (object) {
        return _super.prototype.isSupported.call(this, object) && this.object instanceof babylonjs_materials_1.LavaMaterial;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    LavaMaterialTool.prototype.update = function (object) {
        _super.prototype.update.call(this, object);
        // Diffuse
        var diffuse = this.tool.addFolder('Diffuse');
        diffuse.open();
        this.tool.addColor(diffuse, 'Color', this.object.diffuseColor).open();
        this.tool.addTexture(diffuse, this.editor, 'diffuseTexture', this.object, false).name('Texture');
        // Lava
        var lava = this.tool.addFolder('Lava');
        lava.open();
        this.tool.addTexture(lava, this.editor, 'noiseTexture', this.object, false).name('Noise');
        lava.add(this.object, 'movingSpeed').min(0).name('Moving Speed');
        lava.add(this.object, 'lowFrequencySpeed').min(0).name('Low Frequency Speed');
        // Fog
        var fog = this.tool.addFolder('Fog');
        fog.open();
        this.tool.addColor(fog, 'Fog Color', this.object.fogColor).open();
        fog.add(this.object, 'fogDensity').min(0).name('Fog Density');
        // Options
        _super.prototype.addOptions.call(this);
    };
    return LavaMaterialTool;
}(material_tool_1.default));
exports.default = LavaMaterialTool;
//# sourceMappingURL=lava-tool.js.map