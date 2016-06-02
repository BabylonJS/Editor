var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MaterialTool = (function (_super) {
            __extends(MaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function MaterialTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "MATERIAL.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
                this._forbiddenElements = [
                    "pointSize",
                    "sideOrientation",
                    "alphaMode",
                    "zOffset",
                    "fillMode"
                ];
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            MaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
            };
            // Update
            MaterialTool.prototype.update = function () {
                var object = this._editionTool.object.material;
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                if (!object || !(object instanceof BABYLON.Material))
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name");
                var propertiesFolder = this._element.addFolder("Properties");
                this._addNumberFields(propertiesFolder, object);
                var colorsFolder = this._element.addFolder("Colors");
                colorsFolder.close();
                this._addColorFields(colorsFolder, object);
            };
            // Resize
            MaterialTool.prototype.resize = function () {
                this._element.width = this._editionTool.panel.width - 15;
            };
            // Adds a number
            MaterialTool.prototype._addNumberFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (typeof value === "number" && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        folder.add(object, thing).name(thing);
                    }
                }
            };
            // Adds colors
            MaterialTool.prototype._addColorFields = function (folder, object) {
                for (var thing in object) {
                    var value = object[thing];
                    if (value instanceof BABYLON.Color3 && thing[0] !== "_" && this._forbiddenElements.indexOf(thing) === -1) {
                        var colorFolder = this._element.addFolder(thing, folder);
                        colorFolder.close();
                        colorFolder.add(object[thing], "r").name(thing + "R");
                        colorFolder.add(object[thing], "g").name(thing + "G");
                        colorFolder.add(object[thing], "b").name(thing + "B");
                    }
                }
            };
            return MaterialTool;
        })(EDITOR.AbstractTool);
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
