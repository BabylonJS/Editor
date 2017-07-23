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
            var GUICodeEditor = (function (_super) {
                __extends(GUICodeEditor, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUICodeEditor(name, core) {
                    var _this = _super.call(this, name, core) || this;
                    // Public members
                    _this.defaultValue = "";
                    _this.extraLibs = [];
                    return _this;
                }
                // Destroys the editor
                GUICodeEditor.prototype.destroy = function () {
                    this.element.dispose();
                };
                // Build element
                GUICodeEditor.prototype.buildElement = function (parent) {
                    var _this = this;
                    var parentElement = $("#" + parent);
                    var browserRequire = require;
                    browserRequire.config({ paths: { "vs": "node_modules/monaco-editor/min/vs/" } });
                    browserRequire(["vs/editor/editor.main"], function () {
                        _this.element = monaco.editor.create(parentElement[0], {
                            value: _this.defaultValue,
                            language: "javascript",
                            automaticLayout: true,
                            selectionHighlight: true
                        });
                        if (_this.onReady)
                            _this.onReady();
                        if (!GUICodeEditor._Defines) {
                            BABYLON.Tools.LoadFile("defines/babylon.d.ts", function (data) {
                                GUICodeEditor._Defines = data + "\n" +
                                    "declare var scene: BABYLON.Scene;\n" +
                                    "declare var mesh: BABYLON.Mesh;\n" +
                                    "declare var pointlight: BABYLON.PointLight;\n" +
                                    "declare var universalcamera: BABYLON.UniversalCamera;\n";
                                _this._resetExtraLib();
                            });
                        }
                    });
                };
                // Reset extra libs
                GUICodeEditor.prototype._resetExtraLib = function () {
                    if (GUICodeEditor._ExtraLib)
                        GUICodeEditor._ExtraLib.dispose();
                    GUICodeEditor._ExtraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(GUICodeEditor._Defines, "babylon.d.ts" + EDITOR.SceneFactory.GenerateUUID());
                };
                return GUICodeEditor;
            }(GUI.GUIElement));
            // Private members
            // Static members
            GUICodeEditor._Defines = null;
            GUICodeEditor._ExtraLib = null;
            GUI.GUICodeEditor = GUICodeEditor;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.guiCodeEditor.js.map
