var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var BehaviorEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function BehaviorEditor(core) {
                var _this = this;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._editor = null;
                this._edit = null;
                this._currentNode = null;
                this._currentScript = null;
                this._scripts = [];
                // Initialize
                this._core = core;
                // Finish
                if (!BehaviorEditor._Template) {
                    BABYLON.Tools.LoadFile("website/resources/behavior.editor.txt", function (data) {
                        BehaviorEditor._Template = data;
                        _this._createUI();
                    });
                }
                else
                    this._createUI();
            }
            /**
            * Disposes the application
            */
            BehaviorEditor.prototype.dispose = function () {
                this._layouts.destroy();
                this._editor.destroy();
                this._core.removeEventReceiver(this);
            };
            /**
            * On event
            */
            BehaviorEditor.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (object instanceof BABYLON.Node) {
                        object.metadata = object.metadata || {};
                        // ctor
                        var ctor = EDITOR.Tools.GetConstructorName(object).toLowerCase();
                        var code = BehaviorEditor._Template;
                        while (code.indexOf("{{type}}") !== -1)
                            code = code.replace("{{type}}", ctor);
                        // Register metadata
                        object.metadata["behavior"] = object.metadata["behavior"] || [{
                                code: code,
                                name: "scripts",
                                active: true
                            }];
                        this._currentNode = object;
                        // Edit form
                        this._configureEditForm();
                        // Set code
                        this._editor.element.setValue(object.metadata["behavior"][0].code);
                    }
                }
                return false;
            };
            // Creates the UI
            BehaviorEditor.prototype._createUI = function () {
                var _this = this;
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Behavior Editor", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layouts
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("BEHAVIOR-EDITOR-LEFT-PANEL", "left", 250, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "BEHAVIOR-EDITOR-EDIT"));
                this._layouts.createPanel("BEHAVIOR-EDITOR-RIGHT-PANEL", "main", undefined, true).setContent(EDITOR.GUI.GUIElement.CreateDivElement("BEHAVIOR-EDITOR-CODE", "width: 100%; height: 100%;"));
                this._layouts.buildElement(this._containerID);
                // Editor
                this._layouts.lockPanel("main", "Loading...", true);
                this._editor = new EDITOR.GUI.GUICodeEditor("Behavior Code Editor", this._core);
                this._editor.onReady = function () {
                    _this._layouts.unlockPanel("main");
                    _this._core.eventReceivers.push(_this);
                    _this._bindEvents();
                };
                this._editor.buildElement("BEHAVIOR-EDITOR-CODE");
            };
            // Configures the edit form
            BehaviorEditor.prototype._configureEditForm = function () {
                if (this._edit)
                    this._edit.remove();
                this._edit = new EDITOR.GUI.GUIEditForm("Edit Behavior", this._core);
                this._edit.buildElement("BEHAVIOR-EDITOR-EDIT");
                // Scripts
                this._scripts = [];
                var datas = this._currentNode.metadata["behavior"];
                for (var i = 0; i < datas.length; i++)
                    this._scripts.push(datas[i].name);
                this._currentScript = datas[0];
                this._edit.add(this._currentScript, "name", this._scripts).name("Script");
                this._edit.add(this._currentScript, "active").name("Active");
            };
            // Bind the events
            BehaviorEditor.prototype._bindEvents = function () {
                var _this = this;
                this._editor.element.onDidChangeModelContent(function () {
                    if (_this._currentNode) {
                        debugger;
                        _this._currentScript.code = _this._editor.element.getValue();
                    }
                });
            };
            return BehaviorEditor;
        }());
        // Statics
        BehaviorEditor._Template = null;
        EDITOR.BehaviorEditor = BehaviorEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.behaviorEditor.js.map
