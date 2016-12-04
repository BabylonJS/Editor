var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractMeshTool = (function (_super) {
            __extends(AbstractMeshTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractMeshTool(editionTool, containerID, tabID, tabName) {
                _super.call(this, editionTool);
                // Public members
                // Private members
                this._tabName = "New Tab";
                this.mesh = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-" + containerID
                ];
                this.tab = "MESH." + tabID;
                this._tabName = tabName;
            }
            // Object supported
            AbstractMeshTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh && this.onObjectSupported(object))
                    return true;
                return false;
            };
            // Creates the UI
            AbstractMeshTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
            };
            // Update
            AbstractMeshTool.prototype.update = function () {
                var object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                this.mesh = object;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                return true;
            };
            return AbstractMeshTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AbstractMeshTool = AbstractMeshTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.abstractMeshTool.js.map
