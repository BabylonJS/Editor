var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                function GUIElement(name) {
                    // Public members
                    this.element = null;
                    // Members
                    this.name = name;
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
                GUIElement.prototype.buildElement = function (parent) {
                };
                return GUIElement;
            })();
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
