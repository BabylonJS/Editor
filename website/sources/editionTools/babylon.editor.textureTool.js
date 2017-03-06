var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var TextureTool = (function (_super) {
            __extends(TextureTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function TextureTool(editionTool) {
                var _this = _super.call(this, editionTool) || this;
                // Public members
                _this.tab = "TEXTURE.TAB";
                // Private members
                _this._currentCoordinatesMode = "";
                // Initialize
                _this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-TEXTURE"
                ];
                return _this;
            }
            // Object supported
            TextureTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.BaseTexture)
                    return true;
                return false;
            };
            // Creates the UI
            TextureTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Texture" });
            };
            // Update
            TextureTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Common
                var coordinatesModes = [
                    "EXPLICIT_MODE",
                    "SPHERICAL_MODE",
                    "PLANAR_MODE",
                    "CUBIC_MODE",
                    "PROJECTION_MODE",
                    "SKYBOX_MODE",
                    "INVCUBIC_MODE",
                    "EQUIRECTANGULAR_MODE",
                    "FIXED_EQUIRECTANGULAR_MODE"
                ];
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "getAlphaFromRGB").name("Get Alpha From RGB");
                commonFolder.add(object, "hasAlpha").name("Has Alpha");
                this._currentCoordinatesMode = coordinatesModes[object.coordinatesMode];
                commonFolder.add(this, "_currentCoordinatesMode", coordinatesModes, "Coordinates Mode").name("Coordinates Mode").onChange(function (value) { return object.coordinatesMode = BABYLON.Texture[value]; });
                // Texture
                if (object instanceof BABYLON.Texture) {
                    var textureFolder = this._element.addFolder("Texture");
                    textureFolder.add(object, "uScale").name("uScale");
                    textureFolder.add(object, "vScale").name("vScale");
                    textureFolder.add(this, "_createNormalMapEditor").name("Create normal map...");
                }
                // Mirror texture
                if (object instanceof BABYLON.MirrorTexture) {
                    var mirror = this._element.addFolder("Mirror");
                    mirror.add(object.mirrorPlane, "d").step(0.01).name("d");
                    mirror.add(object.mirrorPlane.normal, "x").min(-1).max(1).step(0.01).name("Normal X");
                    mirror.add(object.mirrorPlane.normal, "y").min(-1).max(1).step(0.01).name("Normal Y");
                    mirror.add(object.mirrorPlane.normal, "z").min(-1).max(1).step(0.01).name("Normal Z");
                }
                return true;
            };
            // Create normal map editor
            TextureTool.prototype._createNormalMapEditor = function () {
                var _this = this;
                var editor = new EDITOR.NormalMapEditor(this._editionTool.core, this.object);
                editor.onApply = function (texture) {
                    _this._editionTool.isObjectSupported(texture);
                };
            };
            return TextureTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.TextureTool = TextureTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.textureTool.js.map
