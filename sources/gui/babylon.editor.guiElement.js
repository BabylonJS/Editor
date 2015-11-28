var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                /**
                * Constructor
                * @param name: the gui element name
                * @param core: the editor core
                */
                function GUIElement(name, core) {
                    // Public members
                    this.element = null;
                    this.name = "";
                    this.core = null;
                    // Members
                    this.name = name;
                    this.core = core;
                }
                GUIElement.prototype.destroy = function () {
                    this.element.destroy();
                };
                GUIElement.prototype.refresh = function () {
                    this.element.refresh();
                };
                GUIElement.prototype.on = function (event, callback) {
                    this.element.on(event, callback);
                };
                GUIElement.prototype.buildElement = function (parent) { };
                return GUIElement;
            })();
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.guiElement.js.map