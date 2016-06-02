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
                function GUILayout(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.panels = [];
                }
                GUILayout.prototype.createPanel = function (name, type, size, resizable) {
                    if (resizable === void 0) { resizable = true; }
                    var panel = new GUI.GUIPanel(name, type, size, resizable, this.core);
                    this.panels.push(panel);
                    return panel;
                };
                GUILayout.prototype.lockPanel = function (type, message, spinner) {
                    this.element.lock(type, message, spinner);
                };
                GUILayout.prototype.unlockPanel = function (type) {
                    this.element.unlock(type);
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
                    var _this = this;
                    this.element = $("#" + parent).w2layout({
                        name: this.name,
                        panels: this.panels
                    });
                    this.element.on({ type: "resize", execute: "after" }, function () {
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.LAYOUT_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                    // Set panels
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
