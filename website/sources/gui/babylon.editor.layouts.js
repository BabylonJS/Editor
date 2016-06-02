var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUILayout = (function (_super) {
                __extends(GUILayout, _super);
                function GUILayout(name) {
                    _super.call(this, name);
                }
                GUILayout.prototype.createPanel = function (id, type, size, resizable) {
                    return null;
                };
                GUILayout.prototype.getPanelFromType = function (type) {
                    return null;
                };
                GUILayout.prototype.getPanelFromID = function (id) {
                    return null;
                };
                GUILayout.prototype.setPanelSize = function (type, size) {
                };
                GUILayout.prototype.buildElement = function (parent) {
                    this.element = $(parent).w2layout({
                        name: this.name,
                        panels: null
                    });
                    return this;
                };
                return GUILayout;
            })(GUI.GUIElement);
            GUI.GUILayout = GUILayout;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
