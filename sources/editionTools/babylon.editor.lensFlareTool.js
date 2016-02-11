var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LensFlareTool = (function (_super) {
            __extends(LensFlareTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LensFlareTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LENSFLARE.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
                ];
            }
            // Object supported
            LensFlareTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            LensFlareTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
            };
            // Update
            LensFlareTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
                // Flares
                for (var i = 0; i < object.lensFlares.length; i++) {
                    var lf = object.lensFlares[i];
                    var lfFolder = this._element.addFolder("Flare " + i);
                    if (i > 0)
                        lfFolder.close();
                    var colorFolder = this._element.addFolder("Color", lfFolder);
                    colorFolder.add(lf.color, "r").min(0).max(1).name("R");
                    colorFolder.add(lf.color, "g").min(0).max(1).name("G");
                    colorFolder.add(lf.color, "b").min(0).max(1).name("B");
                    lfFolder.add(lf, "position").step(0.1).name("Position");
                    lfFolder.add(lf, "size").step(0.1).name("Size");
                }
            };
            return LensFlareTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.LensFlareTool = LensFlareTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.lensFlareTool.js.map