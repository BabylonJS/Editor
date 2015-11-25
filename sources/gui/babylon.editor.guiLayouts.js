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
            var GUILayout = (function (_super) {
                __extends(GUILayout, _super);
                /**
                * Constructor
                * @param name: layouts name
                */
                function GUILayout(name) {
                    _super.call(this, name);
                    // Public members
                    this.panels = new Array();
                }
                GUILayout.prototype.createPanel = function (name, type, size, resizable) {
                    if (resizable === void 0) { resizable = true; }
                    var panel = new GUI.GUIPanel(name, type, size, resizable);
                    this.panels.push(panel);
                    return panel;
                };
                GUILayout.prototype.getPanelFromType = function (type) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].type === type) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.getPanelFromName = function (name) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].name === name) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.setPanelSize = function (panelType, size) {
                    this.element.sizeTo(panelType, size);
                };
                GUILayout.prototype.buildElement = function (parent) {
                    this.element = $("#" + parent).w2layout({
                        name: this.name,
                        panels: this.panels
                    });
                    for (var i = 0; i < this.panels.length; i++) {
                        this.panels[i]._panelElement = this.element.get(this.panels[i].type);
                    }
                };
                return GUILayout;
            })(GUI.GUIElement);
            GUI.GUILayout = GUILayout;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
