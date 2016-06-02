var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIList = (function (_super) {
                __extends(GUIList, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUIList(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.items = [];
                }
                // Creates a new item
                GUIList.prototype.addItem = function (name) {
                    this.items.push(name);
                    return this;
                };
                // Returns the selected item
                GUIList.prototype.getSelected = function () {
                    var value = this.element.val();
                    return this.element.items.indexOf(value);
                };
                // Build element
                GUIList.prototype.buildElement = function (parent) {
                    this.element = $("input[type = list]" + "#" + parent).w2field("list", {
                        items: this.items,
                        selected: this.items.length > 0 ? this.items[0] : ""
                    });
                };
                return GUIList;
            })(GUI.GUIElement);
            GUI.GUIList = GUIList;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
