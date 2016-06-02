var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeneralTool = (function (_super) {
            __extends(GeneralTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GeneralTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "GENERAL.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
                ];
            }
            // Object supported
            GeneralTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh
                    || object instanceof BABYLON.Light
                    || object instanceof BABYLON.Camera
                    || object instanceof BABYLON.ParticleSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            GeneralTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "General" });
            };
            // Update
            GeneralTool.prototype.update = function () {
                var object = this._editionTool.object;
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name");
                var transformFolder = this._element.addFolder("Transforms");
                if (object.position) {
                    var positionFolder = this._element.addFolder("Position", transformFolder);
                    positionFolder.add(object.position, "x").name("Position X").step(0.1);
                    positionFolder.add(object.position, "y").name("Position Y").step(0.1);
                    positionFolder.add(object.position, "z").name("Position Z").step(0.1);
                }
                if (object.rotation) {
                    var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                    rotationFolder.add(object.rotation, "x").name("Rotation X").step(0.1);
                    rotationFolder.add(object.rotation, "y").name("Rotation Y").step(0.1);
                    rotationFolder.add(object.rotation, "z").name("Rotation Z").step(0.1);
                }
                if (object.scaling) {
                    var scalingFolder = this._element.addFolder("Scaling", transformFolder);
                    scalingFolder.add(object.scaling, "x").name("Scaling X").step(0.1);
                    scalingFolder.add(object.scaling, "y").name("Scaling Y").step(0.1);
                    scalingFolder.add(object.scaling, "z").name("Scaling Z").step(0.1);
                }
            };
            // Resize
            GeneralTool.prototype.resize = function () {
                this._element.width = this._editionTool.panel.width - 15;
            };
            return GeneralTool;
        })(EDITOR.AbstractTool);
        EDITOR.GeneralTool = GeneralTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
