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
                    "BABYLON-EDITOR-EDITION-TOOL-GENERAL",
                    "BABYLON-EDITOR-EDITION-TOOL-TRANSFORM"
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
                // Tabs
                this._editionTool.panel.createTab({ id: "GENERAL.TAB", caption: "General" });
                // --0 General
                this._generalForm = new EDITOR.GUI.GUIForm(this.containers[0], "General");
                this._generalForm.createField("NAME", "text", "Name :", 6);
                this._generalForm.createField("ENABLED", "checkbox", "Enabled :", 6);
                this._generalForm.buildElement(this.containers[0]);
                // --1 Transforms
                this._transformsForm = new EDITOR.GUI.GUIForm(this.containers[1], "General");
                this._transformsForm.createField("POSITION", "text", "Position :", 6, "<img src=\"images/position.png\" />");
                this._transformsForm.createField("ROTATION", "text", "Rotation :", 6, "<img src=\"images/rotation.png\" />");
                this._transformsForm.createField("SCALING", "text", "Scaling :", 6, "<img src=\"images/scale.png\" />");
                this._transformsForm.buildElement(this.containers[1]);
            };
            // Update
            GeneralTool.prototype.update = function () {
                var object = this._editionTool.object;
                // General
                this._generalForm.setRecord("NAME", object.name);
                this._generalForm.setRecord("ENABLED", object.isEnabled());
                // Transforms
                this._transformsForm.setRecord("POSITION", EDITOR.Tools.GetStringFromVector3(object.position));
                this._transformsForm.setRecord("ROTATION", EDITOR.Tools.GetStringFromVector3(object.rotation));
                this._transformsForm.setRecord("SCALING", EDITOR.Tools.GetStringFromVector3(object.scaling));
            };
            // Apply
            GeneralTool.prototype.apply = function () {
            };
            return GeneralTool;
        })();
        EDITOR.GeneralTool = GeneralTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
