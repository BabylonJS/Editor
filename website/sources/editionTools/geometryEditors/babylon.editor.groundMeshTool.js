var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GroundMeshTool = (function (_super) {
            __extends(GroundMeshTool, _super);
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GroundMeshTool(editionTool) {
                var _this = _super.call(this, editionTool, "GROUND-MESH", "GROUND", "Ground") || this;
                // Public members
                // Private members
                _this._subdivisions = 0;
                // Initialize
                _this.onObjectSupported = function (mesh) { return mesh instanceof BABYLON.GroundMesh; };
                return _this;
            }
            // Update
            GroundMeshTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                // Geometry
                this._subdivisions = this.mesh.subdivisions;
                var geometryFolder = this._element.addFolder("Geometry");
                geometryFolder.add(this.mesh, "_width").min(0.1).step(0.1).name("Width").onChange(function () { return _this._propertyChanged(); });
                geometryFolder.add(this, "_subdivisions").min(1).max(1000).step(1).name("Subdivisions").onChange(function () { return _this._propertyChanged(); });
                // Finish
                return true;
            };
            // Property changed
            GroundMeshTool.prototype._propertyChanged = function () {
                this.mesh.geometry.setAllVerticesData(BABYLON.VertexData.CreateGround({
                    width: this.mesh._width,
                    height: this.mesh._width,
                    subdivisions: this._subdivisions
                }));
                this.mesh._subdivisionsX = this.mesh._subdivisionsY = this._subdivisions;
            };
            return GroundMeshTool;
        }(EDITOR.AbstractMeshTool));
        EDITOR.GroundMeshTool = GroundMeshTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.groundMeshTool.js.map
