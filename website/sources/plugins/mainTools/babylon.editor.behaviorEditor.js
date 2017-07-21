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
                this._list = null;
                this._currentNode = null;
                this._currentScript = null;
                this._scripts = [];
                // Initialize
                this._core = core;
                // Metadatas
                var metadatas = EDITOR.SceneManager.GetCustomMetadata("BehaviorExtension") || [];
                EDITOR.SceneManager.AddCustomMetadata("BehaviorExtension", metadatas);
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
                this._list.destroy();
                this._editor.destroy();
                this._core.removeEventReceiver(this);
            };
            /**
            * On event
            */
            BehaviorEditor.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT && event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (object instanceof BABYLON.Node || object instanceof BABYLON.Scene) {
                        object.metadata = object.metadata || {};
                        // Reset editor
                        this._currentNode = null;
                        this._editor.element.setValue("");
                        // Register metadata and set current node
                        object.metadata["behavior"] = object.metadata["behavior"] || [];
                        this._currentNode = object;
                        // Scripts lits
                        this._configureList();
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
                this._layouts.createPanel("BEHAVIOR-EDITOR-LEFT-PANEL", "left", 350, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "BEHAVIOR-EDITOR-EDIT"));
                this._layouts.createPanel("BEHAVIOR-EDITOR-RIGHT-PANEL", "main", undefined, true).setContent(EDITOR.GUI.GUIElement.CreateDivElement("BEHAVIOR-EDITOR-CODE", "width: 100%; height: 100%;"));
                this._layouts.buildElement(this._containerID);
                // List
                this._list = new EDITOR.GUI.GUIGrid("BehaviorList", this._core);
                this._list.showAdd = true;
                this._list.showDelete = true;
                this._list.onAdd = function () { return _this._addScript(); };
                this._list.onDelete = function (selected) { return _this._deleteScript(selected); };
                this._list.onClick = function () { return _this._selectScript(); };
                this._list.onChange = function (recid, value) { return _this._changeScript(recid, value); };
                this._list.createEditableColumn("name", "Name", { type: "string" }, "100%");
                this._list.buildElement("BEHAVIOR-EDITOR-EDIT");
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
            // Adds a new script
            BehaviorEditor.prototype._addScript = function () {
                // ctor
                var ctor = EDITOR.Tools.GetConstructorName(this._currentNode).toLowerCase();
                var code = BehaviorEditor._Template;
                while (code.indexOf("{{type}}") !== -1)
                    code = code.replace("{{type}}", ctor);
                // Register metadata
                var data = {
                    code: code,
                    name: "scripts " + EDITOR.SceneFactory.GenerateUUID(),
                    active: true
                };
                this._currentNode.metadata["behavior"].push(data);
                this._configureList();
                // Set code
                this._currentScript = data;
                this._editor.element.setValue(this._currentScript.code);
            };
            // Select current script
            BehaviorEditor.prototype._selectScript = function () {
                var rows = this._list.getSelectedRows();
                if (rows.length < 1)
                    return;
                this._currentScript = this._currentNode.metadata["behavior"][rows[0]];
                this._editor.element.setValue(this._currentScript.code);
            };
            // Change script
            BehaviorEditor.prototype._changeScript = function (recid, value) {
                if (!this._currentNode)
                    return;
                var metadatas = this._currentNode.metadata["behavior"];
                if (recid > metadatas.length)
                    return;
                metadatas[recid].name = value;
                this._list.refresh();
            };
            // Delete script
            BehaviorEditor.prototype._deleteScript = function (recid) {
                if (!this._currentNode || recid.length < 1)
                    return;
                var metadatas = this._currentNode.metadata["behavior"];
                if (recid[0] > metadatas.length)
                    return;
                metadatas.splice(recid[0], 1);
                this._currentScript = null;
                if (this._currentScript)
                    this._editor.element.setValue("");
            };
            // Configures the list
            BehaviorEditor.prototype._configureList = function () {
                var metadatas = this._currentNode.metadata["behavior"];
                this._list.clear();
                for (var i = 0; i < metadatas.length; i++) {
                    this._list.addRecord({
                        name: metadatas[i].name,
                        recid: i
                    });
                }
                this._list.refresh();
            };
            // Bind the events
            BehaviorEditor.prototype._bindEvents = function () {
                var _this = this;
                this._editor.element.onDidChangeModelContent(function () {
                    if (_this._currentNode && _this._currentScript) {
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
