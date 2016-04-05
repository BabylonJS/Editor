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
                    this.menus = [];
                }
                // Creates a new menu
                GUIToolbar.prototype.createMenu = function (type, id, text, icon, checked, tooltip) {
                    var menu = {
                        type: type,
                        id: id,
                        text: text,
                        img: icon,
                        checked: checked || false,
                        hint: tooltip,
                        items: []
                    };
                    this.menus.push(menu);
                    return menu;
                };
                // Creates a new menu item
                GUIToolbar.prototype.createMenuItem = function (menu, type, id, text, icon, checked, disabled) {
                    var item = {
                        type: type,
                        id: id,
                        text: text,
                        icon: icon,
                        checked: checked || false,
                        disabled: disabled || false
                    };
                    menu.items.push(item);
                    return item;
                };
                // Creates a new input element
                GUIToolbar.prototype.createInput = function (id, inputId, text, size) {
                    if (size === void 0) { size = 10; }
                    var item = {
                        type: "html",
                        id: id,
                        html: "<div style=\"padding: 3px 10px;\">" +
                            text +
                            "    <input size=\"" + size + "\" id=\"" + inputId + "\" style=\"padding: 3px; border-radius: 2px; border: 1px solid silver\"/>" +
                            "</div>",
                        text: text,
                    };
                    this.menus.push(item);
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
                // Adds a spacer
                GUIToolbar.prototype.addSpacer = function () {
                    var item = {
                        type: "spacer",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    this.menus.push(item);
                    return item;
                };
                // Sets the item checked
                GUIToolbar.prototype.setItemChecked = function (item, checked, menu) {
                    var id = menu ? menu + ":" + item : item;
                    checked ? this.element.check(id) : this.element.uncheck(id);
                };
                // Sets the item auto checked (true to false, false to true)
                GUIToolbar.prototype.setItemAutoChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu + ":" + item : item);
                    var checked = result ? result.checked : false;
                    if (!checked)
                        this.element.check(item);
                    else
                        this.element.uncheck(item);
                };
                // Returns if the item is checked
                GUIToolbar.prototype.isItemChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu + ":" + item : item);
                    if (result)
                        return result.checked;
                    return false;
                };
                // Sets an item enabled or not
                GUIToolbar.prototype.setItemEnabled = function (item, enabled, menu) {
                    var finalID = menu ? menu + ":" + item : item;
                    var result = null;
                    if (menu)
                        result = this.element.get(menu);
                    if (result) {
                        for (var i = 0; i < result.items.length; i++) {
                            if (result.items[i].id === item) {
                                result.items[i].disabled = !enabled;
                                this.refresh();
                                break;
                            }
                        }
                    }
                    else {
                        if (enabled)
                            this.element.enable(finalID);
                        else
                            this.element.disable(finalID);
                    }
                    if (result)
                        return true;
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
                // Returns the decomposed selected menu IDs
                GUIToolbar.prototype.decomposeSelectedMenu = function (id) {
                    var finalIDs = id.split(":");
                    var item = this.getItemByID(finalIDs[finalIDs.length - 1]);
                    if (!item)
                        return null;
                    return {
                        hasParent: finalIDs.length > 1,
                        parent: finalIDs[0],
                        selected: finalIDs.length > 1 ? finalIDs[finalIDs.length - 1] : ""
                    };
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
