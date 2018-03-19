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
var edition_tool_1 = require("../edition-tool");
var GroundTool = /** @class */ (function (_super) {
    __extends(GroundTool, _super);
    function GroundTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'GROUND-TOOL';
        _this.tabName = 'Ground';
        // Private members
        _this._subdivisions = 0;
        _this._heightMapOptions = {};
        _this._minHeight = 0;
        _this._maxHeight = 1;
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    GroundTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.GroundMesh;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    GroundTool.prototype.update = function (ground) {
        var _this = this;
        _super.prototype.update.call(this, ground);
        this._subdivisions = this.object._subdivisionsX;
        this.tool.element.add(this.object, '_width').min(0.1).step(0.1).name('Width').onChange(function () { return _this._propertyChanged(); });
        this.tool.element.add(this.object, '_height').min(0.1).step(0.1).name('Height').onChange(function () { return _this._propertyChanged(); });
        this.tool.element.add(this, '_subdivisions').min(1).max(1000).step(1).name('Subdivisions').onChange(function () { return _this._propertyChanged(); });
        this.tool.element.add(this, '_createFromHeightMap').name('Create From Height Map...');
        // Height map
        var heightMapOptions = this._heightMapOptions[this.object.id];
        if (heightMapOptions) {
            var heightmap = this.tool.element.addFolder('Height Map');
            heightmap.open();
            heightmap.add(heightMapOptions, 'minHeight').step(0.01).name('Min Height').onChange(function () { return _this._heightMapTexture = heightMapOptions.texture; });
            heightmap.add(heightMapOptions, 'maxHeight').step(0.01).name('Max Height').onChange(function () { return _this._heightMapTexture = heightMapOptions.texture; });
            this.tool.addColor(heightmap, 'Color Filter', heightMapOptions.colorFilter, function () { return _this._heightMapTexture = heightMapOptions.texture; }).open();
            heightmap.add(this, '_removeHeightMap').name('Remove Height Map');
        }
    };
    // Property changed
    GroundTool.prototype._propertyChanged = function () {
        var options = this._heightMapOptions[this.object.id];
        if (options)
            this._heightMapTexture = options.texture;
        else {
            this.object.geometry.setAllVerticesData(babylonjs_1.VertexData.CreateGround({
                width: this.object._width,
                height: this.object._height,
                subdivisions: this._subdivisions
            }));
        }
        this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;
    };
    // Create ground from height map
    GroundTool.prototype._createFromHeightMap = function () {
        this.editor.addEditPanelPlugin('texture-viewer', true, 'Texture Viewer', this, '_heightMapTexture', false);
    };
    // Remove height map texture from ground
    GroundTool.prototype._removeHeightMap = function () {
        delete this._heightMapOptions[this.object.id];
        this._propertyChanged();
        this.update(this.object);
    };
    Object.defineProperty(GroundTool.prototype, "_heightMapTexture", {
        // Sets the height map texture
        set: function (texture) {
            var bufferWidth = texture.getSize().width;
            var bufferHeight = texture.getSize().height;
            var buffer = new Uint8Array(texture.readPixels().buffer);
            var options = this._heightMapOptions[this.object.id];
            var update = false;
            if (!options) {
                update = true;
                options = {
                    texture: texture,
                    minHeight: 0,
                    maxHeight: 1,
                    colorFilter: new babylonjs_1.Color3(0.3, 0.59, 0.11)
                };
            }
            this.object.geometry.setAllVerticesData(babylonjs_1.VertexData.CreateGroundFromHeightMap({
                width: this.object._width,
                height: this.object._height,
                subdivisions: this._subdivisions,
                minHeight: options.minHeight,
                maxHeight: options.maxHeight,
                colorFilter: options.colorFilter,
                buffer: buffer,
                bufferWidth: bufferWidth,
                bufferHeight: bufferHeight
            }));
            // Update height map and options
            options.texture = texture;
            this._heightMapOptions[this.object.id] = options;
            this.object._subdivisionsX = this.object._subdivisionsY = this._subdivisions;
            // Update tool
            if (update)
                this.update(this.object);
        },
        enumerable: true,
        configurable: true
    });
    return GroundTool;
}(edition_tool_1.default));
exports.default = GroundTool;
//# sourceMappingURL=ground-tool.js.map