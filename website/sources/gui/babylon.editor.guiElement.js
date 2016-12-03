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
                GUIElement.CreateElement = function (type, id, style, innerText, br) {
                    if (style === void 0) { style = "width: 100%; height: 100%;"; }
                    if (innerText === void 0) { innerText = ""; }
                    if (br === void 0) { br = false; }
                    return "<" + (type instanceof Array ? type.join(" ") : type) + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + ">" + innerText + "</" + (type instanceof Array ? type[0] : type) + ">" +
                        (br ? "<br />" : "");
                };
                // Creates a new button
                GUIElement.CreateButton = function (parent, id, caption) {
                    var effectiveParent = (typeof parent === "string") ? $("#" + parent) : parent;
                    effectiveParent.append("<button value=\"Red\" id=\"" + id + "\">" + caption + "</button>");
                    return $("#" + id);
                };
                // Creates a transition
                // Available types are:
                // - slide-left
                // - slide-right
                // - slide-top
                // - slide-bottom
                // - flip-left
                // - flip-right
                // - flip-top
                // - flip-bottom
                // - pop-in
                // - pop-out
                GUIElement.CreateTransition = function (div1, div2, type, callback) {
                    w2utils.transition($("#" + div1)[0], $("#" + div2)[0], type, function () {
                        if (callback)
                            callback();
                    });
                };
                return GUIElement;
            }());
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.guiElement.js.map
