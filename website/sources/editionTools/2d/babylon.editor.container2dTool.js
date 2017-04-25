var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Container2DTool = (function (_super) {
            __extends(Container2DTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function Container2DTool(editionTool) {
                var _this = _super.call(this, editionTool) || this;
                // Public members
                _this.object = null;
                _this.tab = "CONTAINER2D.TAB";
                // Private members
                _this._currentDockX = "";
                _this._currentDockY = "";
                _this._resizeType = "";
                _this._currentTexture = null;
                // Initialize
                _this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-CONTAINER-2D"
                ];
                return _this;
            }
            // Object supported
            Container2DTool.prototype.isObjectSupported = function (object) {
                return object instanceof BABYLON.Container2D;
            };
            // Creates the UI
            Container2DTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Container 2D" });
            };
            // Update
            Container2DTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.scene2d;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                var displayFolder = this._element.addFolder("Display");
                // Docking
                if (!object.dock)
                    object.dock = BABYLON.Dock.LEFT | BABYLON.Dock.BOTTOM;
                if (object.dock & BABYLON.Dock.LEFT)
                    this._currentDockX = "LEFT";
                else if (object.dock & BABYLON.Dock.CENTER_HORIZONTAL)
                    this._currentDockX = "CENTER_HORIZONTAL";
                else if (object.dock & BABYLON.Dock.RIGHT)
                    this._currentDockX = "RIGHT";
                if (object.dock & BABYLON.Dock.TOP)
                    this._currentDockY = "TOP";
                else if (object.dock & BABYLON.Dock.CENTER_VERTICAL)
                    this._currentDockY = "CENTER_VERTICAL";
                else if (object.dock & BABYLON.Dock.BOTTOM)
                    this._currentDockY = "BOTTOM";
                var dockingX = ["LEFT", "RIGHT", "CENTER_HORIZONTAL"];
                displayFolder.add(this, "_currentDockX", dockingX).name("Dock X").onFinishChange(function (result) {
                    object.dock = BABYLON.Dock[result] | BABYLON.Dock[_this._currentDockY];
                });
                var dockingY = ["TOP", "BOTTOM", "CENTER_VERTICAL"];
                displayFolder.add(this, "_currentDockY", dockingY).name("Dock Y").onFinishChange(function (result) {
                    object.dock = BABYLON.Dock[_this._currentDockX] | BABYLON.Dock[result];
                });
                // resize
                if (!object.resize)
                    object.resize = BABYLON.Resize.NONE;
                var resizeType = ["NONE", "COVER", "CONTAIN", "FIT"];
                this._resizeType = resizeType[this.object.resize];
                displayFolder.add(this, "_resizeType", resizeType).name("Resize type").onFinishChange(function (result) {
                    object.resize = BABYLON.Resize[result];
                });
                // Pivot
                var pivotFolder = this._element.addFolder("Pivot");
                var pivot = object.getPivotPoint();
                pivotFolder.add(pivot, "x").min(0).max(1).step(0.01).name("x").onChange(function () { return object.setPivotPoint(pivot); });
                pivotFolder.add(pivot, "y").min(0).max(1).step(0.01).name("y").onChange(function () { return object.setPivotPoint(pivot); });
                // If sprite
                if (object instanceof BABYLON.Sprite2D) {
                    this._currentTexture = object.textures[object.textureIndex];
                    var spriteFolder = this._element.addFolder("Sprite");
                    this.addTextureFolder(this, "Texture", "_currentTexture", spriteFolder, false, function () {
                        object.setTextures(_this._currentTexture);
                    }).open();
                }
                else {
                    var dimensionsFolder = this._element.addFolder("Dimensions");
                    dimensionsFolder.open();
                    dimensionsFolder.add(object, "width").min(0).step(0.01).name("Width");
                    dimensionsFolder.add(object, "height").min(0).step(0.01).name("Height");
                }
                return true;
            };
            return Container2DTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.Container2DTool = Container2DTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.container2dTool.js.map
