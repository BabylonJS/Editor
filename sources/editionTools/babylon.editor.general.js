var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeneralTool = (function () {
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GeneralTool(editionTool) {
                // Public members
                this.object = null;
                // Initialize
                this._editionTool = editionTool;
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
                ];
            }
            // Object supported
            GeneralTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh || object instanceof BABYLON.Light || object instanceof BABYLON.Camera) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            GeneralTool.prototype.createUI = function () {
                // General
                this._generalForm = new EDITOR.GUI.GUIForm(this.containers[0], "General");
                this._generalForm.createField("NAME", "text", "Name :", 5, "yo");
                this._generalForm.buildElement(this._editionTool.container);
            };
            return GeneralTool;
        })();
        EDITOR.GeneralTool = GeneralTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
