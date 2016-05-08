var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                function GUIElement(name, core) {
                    this.element = null;
                    this.name = "";
                    this.core = null;
                    this.name = name;
                    this.core = core;
                }
                GUIElement.prototype.destroy = function () {
                    this.element.destroy();
                };
                GUIElement.prototype.refresh = function () {
                    this.element.refresh();
                };
                GUIElement.prototype.resize = function () {
                    this.element.resize();
                };
                GUIElement.prototype.on = function (event, callback) {
                    this.element.on(event, callback);
                };
                GUIElement.prototype.buildElement = function (parent) { };
                GUIElement.CreateDivElement = function (id, style) {
                    return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
                };
                GUIElement.CreateElement = function (type, id, style) {
                    if (style === void 0) { style = "width: 100%; height: 100%;"; }
                    return "<" + type + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></" + type + ">";
                };
                return GUIElement;
            }());
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
