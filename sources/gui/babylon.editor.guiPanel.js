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
                /**
                * Constructor
                * @param name: panel name
                * @param type: panel type (left, right, etc.)
                * @param size: panel size
                * @param resizable: if the panel is resizable
                */
                function GUIPanel(name, type, size, resizable) {
                    _super.call(this, name);
                    // Public memebers
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
                // Create tab
                GUIPanel.prototype.createTab = function (tab) {
                    this.tabs.push(tab);
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.add(tab);
                    }
                    return this;
                };
                // Remove tab from id
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
                // Return tab count
                GUIPanel.prototype.getTabCount = function () {
                    return this.tabs.length;
                };
                // Set tab enabled
                GUIPanel.prototype.setTabEnabled = function (id, enable) {
                    if (this._panelElement === null) {
                        return this;
                    }
                    enable ? this._panelElement.tabs.enable(id) : this._panelElement.tabs.disable(id);
                    return this;
                };
                // Return tab id from index
                GUIPanel.prototype.getTabIDFromIndex = function (index) {
                    if (index >= 0 && index < this.tabs.length) {
                        return this.tabs[index].id;
                    }
                    return "";
                };
                // Sets panel content (HTML)
                GUIPanel.prototype.setContent = function (content) {
                    this.content = content;
                    return this;
                };
                return GUIPanel;
            })(GUI.GUIElement);
            GUI.GUIPanel = GUIPanel;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
