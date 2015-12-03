var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ReflectionProbeTool = (function (_super) {
            __extends(ReflectionProbeTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ReflectionProbeTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "REFLECTION.PROBE.TAB";
                // Private members
                this._window = null;
                this._excludedMeshesList = null;
                this._includedMeshesList = null;
                this._layout = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-REFLECTION-PROBE"
                ];
            }
            // Object supported
            ReflectionProbeTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ReflectionProbe) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            ReflectionProbeTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Reflection Probe" });
            };
            // Update
            ReflectionProbeTool.prototype.update = function () {
                _super.prototype.update.call(this);
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                if (!object)
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name");
                generalFolder.add(object, "refreshRate").name("Refresh Rate").min(1.0).step(1);
                generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");
                // Position
                var positionFolder = this._element.addFolder("Position");
                positionFolder.add(object.position, "x").step(0.01);
                positionFolder.add(object.position, "y").step(0.01);
                positionFolder.add(object.position, "z").step(0.01);
            };
            ReflectionProbeTool.prototype._setIncludedMeshes = function () {
                var body = EDITOR.GUI.GUIElement.CreateElement("div", "REFLECTION-PROBES-RENDER-LIST-LAYOUT");
                this._window = new EDITOR.GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
                this._window.modal = true;
                this._window.size.x = 800;
                this._window.buildElement(null);
            };
            return ReflectionProbeTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.ReflectionProbeTool = ReflectionProbeTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.reflectionProbeTool.js.map