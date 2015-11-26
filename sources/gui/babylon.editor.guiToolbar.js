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
            var GUIToolbar = (function (_super) {
                __extends(GUIToolbar, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIToolbar(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = new Array();
                }
                // Creates a new menu
                GUIToolbar.prototype.createMenu = function (type, id, text, icon) {
                    var menu = {
                        type: type,
                        id: id,
                        text: text,
                        img: icon,
                        checked: false,
                        items: []
                    };
                    this.menus.push(menu);
                    return menu;
                };
                // Creates a new menu item
                GUIToolbar.prototype.createMenuItem = function (menu, type, id, text, icon) {
                    var item = {
                        type: type,
                        id: id,
                        text: text,
                        icon: icon,
                        checked: false
                    };
                    menu.items.push(item);
                    return item;
                };
                // Sets the item checked
                GUIToolbar.prototype.setItemChecked = function (item, checked) {
                    var element = this.element;
                    checked ? element.check(item.id) : element.uncheck(item.id);
                };
                // Sets the item auto checked (true to false, false to true)
                GUIToolbar.prototype.setItemAutoChecked = function (item, checked) {
                };
                // Returns if the item is checked
                GUIToolbar.prototype.isItemChecked = function (item) {
                    return this.element.get(item.id).checked;
                };
                // Build element
                GUIToolbar.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2toolbar({
                        name: this.name,
                        items: this.menus,
                        onClick: function (event) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED);
                            ev.guiEvent.data = event.target;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIToolbar;
            })(GUI.GUIElement);
            GUI.GUIToolbar = GUIToolbar;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
