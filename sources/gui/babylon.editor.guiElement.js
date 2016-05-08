var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                // Private members
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
                // Destroy the element (W2UI)
                GUIElement.prototype.destroy = function () {
                    this.element.destroy();
                };
                // Refresh the element (W2UI)
                GUIElement.prototype.refresh = function () {
                    this.element.refresh();
                };
                // Resize the element (W2UI)
                GUIElement.prototype.resize = function () {
                    this.element.resize();
                };
                // Add callback on an event
                GUIElement.prototype.on = function (event, callback) {
                    this.element.on(event, callback);
                };
                // Build the element
                GUIElement.prototype.buildElement = function (parent) { };
                /**
                * Static methods
                */
                // Creates a div element (string)
                GUIElement.CreateDivElement = function (id, style) {
                    return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
                };
                // Creates a custom element (string)
                GUIElement.CreateElement = function (type, id, style) {
                    if (style === void 0) { style = "width: 100%; height: 100%;"; }
                    return "<" + type + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></" + type + ">";
                };
                return GUIElement;
            })();
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
