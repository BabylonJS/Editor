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
                    this.renderDrop = false;
                    this.selected = "";
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
                // Returns the value of the element
                GUIList.prototype.getValue = function () {
                    return this.element.val();
                };
                // Build element
                GUIList.prototype.buildElement = function (parent) {
                    var _this = this;
                    var parentElement = $("#" + parent);
                    var items = [];
                    for (var i = 0; i < this.items.length; i++)
                        items.push({ id: this.items[i], text: this.items[i] });
                    this.element = parentElement.w2field("list", {
                        items: items,
                        selected: { id: this.selected, text: this.selected },
                        renderItem: function (item) {
                            return item.text;
                        },
                        renderDrop: !this.renderDrop ? undefined : function (item) {
                            return item.text;
                        },
                        compare: function (item, search) {
                            debugger;
                            return item.text.indexOf(search) !== -1;
                        }
                    });
                    this.element.change(function (event) {
                        if (_this.onChange)
                            _this.onChange(_this.element.val());
                    });
                };
                return GUIList;
            }(GUI.GUIElement));
            GUI.GUIList = GUIList;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
