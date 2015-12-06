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
                GUIToolbar.prototype.createMenu = function (type, id, text, icon, checked) {
                    var menu = {
                        type: type,
                        id: id,
                        text: text,
                        img: icon,
                        checked: checked || false,
                        items: []
                    };
                    this.menus.push(menu);
                    return menu;
                };
                // Creates a new menu item
                GUIToolbar.prototype.createMenuItem = function (menu, type, id, text, icon, checked) {
                    var item = {
                        type: type,
                        id: id,
                        text: text,
                        icon: icon,
                        checked: checked || false
                    };
                    menu.items.push(item);
                    return item;
                };
                // Adds a break
                GUIToolbar.prototype.addBreak = function (menu) {
                    var item = {
                        type: "break",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    if (menu)
                        menu.items.push(item);
                    else
                        this.menus.push(item);
                    return item;
                };
                // Sets the item checked
                GUIToolbar.prototype.setItemChecked = function (item, checked, menu) {
                    var element = this.element;
                    var id = menu ? menu.id + ":" + item.id : item.id;
                    checked ? element.check(id) : element.uncheck(id);
                };
                // Sets the item auto checked (true to false, false to true)
                GUIToolbar.prototype.setItemAutoChecked = function (item, menu) {
                    var element = this.element;
                    var result = element.get(menu ? menu.id + ":" + item.id : item.id);
                    var checked = result ? result.checked : false;
                    if (!checked)
                        element.check(item.id);
                    else
                        element.uncheck(item.id);
                };
                // Returns if the item is checked
                GUIToolbar.prototype.isItemChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu.id + ":" + item.id : item.id);
                    if (result !== null)
                        result.checked;
                    return false;
                };
                // Returns an item by its ID
                GUIToolbar.prototype.getItemByID = function (id) {
                    for (var i = 0; i < this.menus.length; i++) {
                        var menu = this.menus[i];
                        if (menu.type === "break")
                            continue;
                        if (menu.id === id)
                            return menu;
                        for (var j = 0; j < menu.items.length; j++) {
                            var item = menu.items[j];
                            if (item.id === id)
                                return item;
                        }
                    }
                    return null;
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
//# sourceMappingURL=babylon.editor.guiToolbar.js.map