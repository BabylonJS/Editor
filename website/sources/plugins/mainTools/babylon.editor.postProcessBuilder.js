var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PostProcessBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function PostProcessBuilder(core) {
                var _this = this;
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._texture = null;
                this._scenePassPostProcess = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._mainPanel = null;
                this._postProcessesList = null;
                this._toolbar = null;
                this._glslTabId = null;
                this._configurationTabId = null;
                this._currentTabId = null;
                this._selectTemplateWindow = null;
                this._editor = null;
                this._console = null;
                this._currentSelected = 0;
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Finalize
                this._getConfigurationFile(function () {
                    // Metadatas
                    _this._datas = EDITOR.SceneManager.GetCustomMetadata("PostProcessBuilder");
                    if (!_this._datas) {
                        _this._datas = [{ name: "NewPostProcess", id: EDITOR.SceneFactory.GenerateUUID(), program: BABYLON.Effect.ShadersStore["editorTemplatePixelShader"], configuration: PostProcessBuilder._ConfigurationFileContent }];
                        EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", _this._datas);
                    }
                    // Create UI
                    _this._createUI();
                    _this._onPostProcessSelected([0]);
                    // Extensions
                    _this._extension = new EDITOR.EXTENSIONS.PostProcessBuilderExtension(_this._scene);
                    _this._extension.placeHolderTexture = _this._texture;
                    _this._mainExtension = new EDITOR.EXTENSIONS.PostProcessBuilderExtension(_this._core.currentScene);
                });
            }
            /**
            * Disposes the application
            */
            PostProcessBuilder.prototype.dispose = function () {
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].postProcess) {
                        this._mainExtension.removePostProcess(this._datas[i].postProcess);
                        if (this._datas[i].editorPostProcess)
                            this._extension.removePostProcess(this._datas[i].editorPostProcess);
                        this._datas[i].postProcess = null;
                        this._datas[i].editorPostProcess = null;
                    }
                }
                // Finalize dispose
                this._core.removeEventReceiver(this);
                this._toolbar.destroy();
                this._postProcessesList.destroy();
                this._editor.destroy();
                this._console.destroy();
                this._layouts.destroy();
                this._engine.dispose();
            };
            /**
            * On event
            */
            PostProcessBuilder.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.KEY_EVENT) {
                    if (event.keyEvent.control && event.keyEvent.key === "b" && !event.keyEvent.isDown) {
                        this._onApplyPostProcessChain(false);
                    }
                }
                return false;
            };
            // Creates the UI
            PostProcessBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Post-Process Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("POST-PROCESS-BUILDER-TOP-PANEL", "top", 45, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-TOOLBAR"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-LEFT-PANEL", "left", 300, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-PROGRAM"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-PREVIEW-PANEL", "preview", 150, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-CONSOLE"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._editor.resize(true);
                });
                this._glslTabId = this._currentTabId = EDITOR.SceneFactory.GenerateUUID();
                this._configurationTabId = EDITOR.SceneFactory.GenerateUUID();
                this._mainPanel = this._layouts.getPanelFromType("main");
                this._mainPanel.createTab({ caption: "GLSL", closable: false, id: this._glslTabId });
                this._mainPanel.createTab({ caption: "Configuration", closable: false, id: this._configurationTabId });
                this._mainPanel.onTabChanged = function (id) { return _this._onTabChanged(id); };
                // GUI
                var container = $("#POST-PROCESS-BUILDER-EDIT");
                container.append(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT-LIST", "width: 100%; height: 200px;"));
                // Toolbar
                this._toolbar = new EDITOR.GUI.GUIToolbar("POST-PROCESS-BUILDER-TOOLBAR", this._core);
                this._toolbar.createMenu("button", "BUILD-CHAIN", "Apply Chain (CTRL + B)", "icon-play-game", false, "Builds post-processes and applies chain");
                this._toolbar.addBreak();
                this._toolbar.createMenu("button", "BUILD-CHAIN-SCENE", "Apply Chain on Scene", "icon-scene", false, "Builds post-processes and applies chain on scene");
                this._toolbar.buildElement("POST-PROCESS-BUILDER-TOOLBAR");
                this._toolbar.onClick = function (item) { return _this._onApplyPostProcessChain(item.parent === "BUILD-CHAIN-SCENE"); };
                // List
                this._postProcessesList = new EDITOR.GUI.GUIGrid("POST-PROCESS-BUILDER-EDIT-LIST", this._core);
                this._postProcessesList.createEditableColumn("name", "name", { type: "string" }, "100%");
                this._postProcessesList.multiSelect = false;
                this._postProcessesList.showAdd = true;
                this._postProcessesList.showDelete = true;
                this._postProcessesList.showOptions = false;
                this._postProcessesList.onClick = function (selected) { return _this._onPostProcessSelected(selected); };
                this._postProcessesList.onAdd = function () { return _this._onPostProcessAdd(); };
                this._postProcessesList.onDelete = function (selected) { return _this._onPostProcessRemove(selected); };
                this._postProcessesList.onEditField = function (recid, value) { return _this._onPostProcessEditField(recid, value); };
                this._postProcessesList.buildElement("POST-PROCESS-BUILDER-EDIT-LIST");
                for (var i = 0; i < this._datas.length; i++)
                    this._postProcessesList.addRecord({ name: this._datas[i].name, recid: i });
                this._postProcessesList.refresh();
                // Canvas
                container.append("<br />");
                container.append("<hr>");
                container.append(EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%;", "Preview:", false));
                var canvasID = EDITOR.SceneFactory.GenerateUUID();
                container.append(EDITOR.GUI.GUIElement.CreateElement("canvas", canvasID, "width: 100%; height: 300px", null, true));
                this._engine = new BABYLON.Engine($("#" + canvasID)[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.Camera("PostProcessCamera", BABYLON.Vector3.Zero(), this._scene);
                this._texture = new BABYLON.Texture("website/Tests/textures/no_smoke.png", this._scene);
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                // Editor
                this._editor = ace.edit("POST-PROCESS-BUILDER-PROGRAM");
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/glsl");
                this._editor.getSession().setValue(BABYLON.Effect.ShadersStore["passPixelShader"]);
                this._editor.getSession().on("change", function (e) { return _this._onEditorChanged(); });
                // Console
                this._console = ace.edit("POST-PROCESS-BUILDER-CONSOLE");
                this._console.getSession().setValue("Ready.");
                BABYLON.Tools.Error = function (entry) {
                    _this._console.getSession().setValue(_this._console.getSession().getValue() + "\n" + entry);
                };
            };
            // On tab changed
            PostProcessBuilder.prototype._onTabChanged = function (id) {
                this._currentTabId = id;
                if (id === this._glslTabId) {
                    this._editor.getSession().setMode("ace/mode/glsl");
                    this._editor.getSession().setValue(this._datas[this._currentSelected].program);
                }
                else {
                    this._editor.getSession().setMode("ace/mode/javascript");
                    this._editor.getSession().setValue(this._datas[this._currentSelected].configuration);
                }
            };
            // When the user selects an item
            PostProcessBuilder.prototype._onPostProcessSelected = function (selected) {
                if (selected.length < 1)
                    return;
                this._currentSelected = selected[0];
                this._editor.getSession().setValue(this._currentTabId === this._glslTabId ? this._datas[selected[0]].program : this._datas[selected[0]].configuration);
            };
            // When the user adds a new post-process
            PostProcessBuilder.prototype._onPostProcessAdd = function () {
                var _this = this;
                var inputID = EDITOR.SceneFactory.GenerateUUID();
                // Window
                this._selectTemplateWindow = new EDITOR.GUI.GUIWindow("SELECT-TEMPLATE-WINDOW", this._core, "Select template", EDITOR.GUI.GUIElement.CreateElement("input", inputID, "width: 100%;"), new BABYLON.Vector2(400, 120), ["Select", "Close"]);
                this._selectTemplateWindow.setOnCloseCallback(function () {
                    _this._selectTemplateWindow.destroy();
                });
                this._selectTemplateWindow.buildElement(null);
                // List
                var items = [];
                for (var thing in BABYLON.Effect.ShadersStore) {
                    if (BABYLON.Effect.ShadersStore[thing].indexOf("textureSampler") !== -1)
                        items.push(thing);
                }
                var list = new EDITOR.GUI.GUIList(inputID, this._core);
                list.renderDrop = true;
                list.items = items;
                list.buildElement(inputID);
                // Events
                this._selectTemplateWindow.onButtonClicked = function (buttonId) {
                    if (buttonId === "Select") {
                        var selected = list.getValue();
                        var data = { name: selected + _this._datas.length, id: EDITOR.SceneFactory.GenerateUUID(), program: BABYLON.Effect.ShadersStore[selected], configuration: PostProcessBuilder._ConfigurationFileContent };
                        _this._datas.push(data);
                        _this._postProcessesList.addRecord({ name: data.name });
                        _this._postProcessesList.refresh();
                    }
                    _this._selectTemplateWindow.close();
                };
            };
            // When the user removes a post-process
            PostProcessBuilder.prototype._onPostProcessRemove = function (selected) {
                var data = this._datas[selected[0]];
                if (data.postProcess)
                    this._mainExtension.removePostProcess(data.postProcess);
                if (data.editorPostProcess)
                    this._extension.removePostProcess(data.editorPostProcess);
                this._datas.splice(selected[0], 1);
                this._currentSelected = -1;
                this._storeMetadatas();
            };
            // When the user edits a row
            PostProcessBuilder.prototype._onPostProcessEditField = function (recid, value) {
                debugger;
            };
            // When the user modifies a post-process
            PostProcessBuilder.prototype._onEditorChanged = function () {
                if (this._currentSelected >= 0) {
                    var value = this._editor.getSession().getValue();
                    if (this._currentTabId === this._glslTabId)
                        this._datas[this._currentSelected].program = value;
                    else
                        this._datas[this._currentSelected].configuration = value;
                }
            };
            // When the user applies the post-process chain
            PostProcessBuilder.prototype._onApplyPostProcessChain = function (applyOnScene) {
                // Clear logs
                this._console.getSession().setValue("Ready.");
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].editorPostProcess) {
                        this._extension.removePostProcess(this._datas[i].editorPostProcess);
                        delete BABYLON.Effect.ShadersStore[this._datas[i].editorPostProcess.name + "PixelShader"];
                        this._datas[i].editorPostProcess = null;
                    }
                    if (this._datas[i].postProcess) {
                        this._mainExtension.removePostProcess(this._datas[i].postProcess);
                        delete BABYLON.Effect.ShadersStore[this._datas[i].postProcess.name + "PixelShader"];
                        this._datas[i].postProcess = null;
                    }
                }
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    data.id = EDITOR.SceneFactory.GenerateUUID();
                    this._extension.applyPostProcess(data);
                    data.editorPostProcess = data.postProcess;
                    data.postProcess = null;
                    if (applyOnScene) {
                        data.id = EDITOR.SceneFactory.GenerateUUID();
                        this._mainExtension.applyPostProcess(data);
                    }
                }
                this._storeMetadatas();
            };
            // Stores the datas into the custom metadatas
            PostProcessBuilder.prototype._storeMetadatas = function () {
                var customData = [];
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    customData.push({ name: data.name, id: data.id, program: data.program, configuration: data.configuration, postProcess: null, editorPostProcess: null });
                }
                EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", customData);
            };
            // Gets the configuration file
            PostProcessBuilder.prototype._getConfigurationFile = function (callback) {
                var _this = this;
                if (!PostProcessBuilder._ConfigurationFileContent) {
                    this._core.editor.layouts.lockPanel("preview", "Loading...", true);
                    BABYLON.Tools.LoadFile("website/resources/template.postprocess.configuration.json", function (data) {
                        PostProcessBuilder._ConfigurationFileContent = data;
                        _this._core.editor.layouts.unlockPanel("preview");
                        callback();
                    });
                }
                else
                    callback();
            };
            return PostProcessBuilder;
        }());
        // Static members
        PostProcessBuilder._ConfigurationFileContent = null;
        EDITOR.PostProcessBuilder = PostProcessBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.postProcessBuilder.js.map
