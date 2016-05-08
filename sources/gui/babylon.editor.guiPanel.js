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
            var GUIPanel = (function (_super) {
                __extends(GUIPanel, _super);
                function GUIPanel(name, type, size, resizable, core) {
                    _super.call(this, name, core);
                    this.tabs = new Array();
                    this.size = 70;
                    this.minSize = 10;
                    this.maxSize = undefined;
                    this.style = "background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;";
                    this.toolbar = null;
                    this.type = type;
                    this.size = size;
                    this.resizable = resizable;
                }
                GUIPanel.prototype.createTab = function (tab) {
                    var _this = this;
                    tab.onClick = function (event) {
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TAB_CHANGED, event.target);
                        _this.core.sendEvent(ev);
                    };
                    this.tabs.push(tab);
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.add(tab);
                    }
                    return this;
                };
                GUIPanel.prototype.removeTab = function (id) {
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.remove(id);
                    }
                    for (var i = 0; i < this.tabs.length; i++) {
                        if (this.tabs[i].id === id) {
                            this.tabs.splice(i, 1);
                            return true;
                        }
                    }
                    return false;
                };
                Object.defineProperty(GUIPanel.prototype, "width", {
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.width;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIPanel.prototype, "height", {
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.height;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                GUIPanel.prototype.getTabCount = function () {
                    return this.tabs.length;
                };
                GUIPanel.prototype.setTabEnabled = function (id, enable) {
                    if (this._panelElement === null) {
                        return this;
                    }
                    enable ? this._panelElement.tabs.enable(id) : this._panelElement.tabs.disable(id);
                    return this;
                };
                GUIPanel.prototype.getTabIDFromIndex = function (index) {
                    if (index >= 0 && index < this.tabs.length) {
                        return this.tabs[index].id;
                    }
                    return "";
                };
                GUIPanel.prototype.setContent = function (content) {
                    this.content = content;
                    return this;
                };
                GUIPanel.prototype.hideTab = function (id) {
                    return this._panelElement.tabs.hide(id) === 1;
                };
                GUIPanel.prototype.showTab = function (id) {
                    return this._panelElement.tabs.show(id) === 1;
                };
                return GUIPanel;
            }(GUI.GUIElement));
            GUI.GUIPanel = GUIPanel;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
