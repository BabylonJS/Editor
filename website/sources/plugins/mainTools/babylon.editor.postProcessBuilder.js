var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        BABYLON.Effect.ShadersStore["editorTemplatePixelShader"] = [
            "varying vec2 vUV;",
            "uniform sampler2D textureSampler;",
            "uniform sampler2D originalSampler;",
            "void main(void) ",
            "{",
            "    gl_FragColor=texture2D(originalSampler, vUV);",
            "}"
        ].join("\n");
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
                this._postProcessesList = null;
                this._selectTemplateWindow = null;
                this._editor = null;
                this._console = null;
                this._currentSelected = 0;
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Metadatas
                this._datas = EDITOR.SceneManager.GetCustomMetadata("PostProcessBuilder");
                if (!this._datas) {
                    this._datas = [{ name: "NewPostProcess", program: BABYLON.Effect.ShadersStore["passPixelShader"] }];
                    EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", this._datas);
                }
                // Create UI
                this._createUI();
                this._onPostProcessSelected([0]);
                // Create main post-process
                var postProcess = new BABYLON.PostProcess("mainPostProcess", "editorTemplate", [], ["originalSampler"], 1.0, this._camera);
                postProcess.onApply = function (effect) {
                    effect.setTexture("originalSampler", _this._texture);
                };
            }
            /**
            * Disposes the application
            */
            PostProcessBuilder.prototype.dispose = function () {
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].postProcess) {
                        this._removePostProcess(this._datas[i].postProcess);
                        this._datas[i].postProcess = null;
                    }
                }
                // Finalize dispose
                this._core.removeEventReceiver(this);
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
                this._layouts.createPanel("POST-PROCESS-BUILDER-LEFT-PANEL", "left", 300, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-PROGRAM"));
                this._layouts.createPanel("POST-PROCESS-BUILDER-PREVIEW-PANEL", "preview", 150, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-CONSOLE"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._editor.resize(true);
                });
                // GUI
                var container = $("#POST-PROCESS-BUILDER-EDIT");
                container.append(EDITOR.GUI.GUIElement.CreateElement("div", "POST-PROCESS-BUILDER-EDIT-LIST", "width: 100%; height: 200px;"));
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
                container.append("<br />");
                container.append("<hr>");
                container.append("<br />");
                // Create build button
                var applyOrderButton = EDITOR.GUI.GUIElement.CreateButton(container, EDITOR.SceneFactory.GenerateUUID(), "Apply Chain (CTRL + B)");
                applyOrderButton.css("width", "100%");
                applyOrderButton.css("position", "absolute");
                applyOrderButton.css("bottom", "10px");
                applyOrderButton.addClass("btn-orange");
                applyOrderButton.click(function (event) { return _this._onApplyPostProcessChain(false); });
                var applyOnSceneButton = EDITOR.GUI.GUIElement.CreateButton(container, EDITOR.SceneFactory.GenerateUUID(), "Apply On Scene");
                applyOnSceneButton.css("width", "100%");
                applyOnSceneButton.css("position", "absolute");
                applyOnSceneButton.css("bottom", "40px");
                applyOnSceneButton.addClass("btn-red");
                applyOnSceneButton.click(function (event) { return _this._onApplyPostProcessChain(true); });
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
            // When the user selects an item
            PostProcessBuilder.prototype._onPostProcessSelected = function (selected) {
                if (selected.length < 1)
                    return;
                this._currentSelected = selected[0];
                this._editor.getSession().setValue(this._datas[selected[0]].program);
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
                        var data = { name: selected + _this._datas.length, program: BABYLON.Effect.ShadersStore[selected] };
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
                if (data.postProcess) {
                    this._removePostProcess(data.postProcess);
                    this._removePostProcess(data.mainPostProcess, true);
                }
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
                if (this._currentSelected >= 0)
                    this._datas[this._currentSelected].program = this._editor.getSession().getValue();
            };
            // When the user applies the post-process chain
            PostProcessBuilder.prototype._onApplyPostProcessChain = function (applyOnScene) {
                // Clear logs
                this._console.getSession().setValue("Ready.");
                // Remove post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    if (this._datas[i].postProcess) {
                        this._removePostProcess(this._datas[i].postProcess);
                        delete BABYLON.Effect.ShadersStore[this._datas[i].postProcess.name + "PixelShader"];
                        this._datas[i].postProcess = null;
                    }
                    if (this._datas[i].mainPostProcess && applyOnScene) {
                        this._removePostProcess(this._datas[i].mainPostProcess, true);
                        this._datas[i].mainPostProcess = null;
                    }
                }
                // Apply original if on scene
                if (applyOnScene && !this._scenePassPostProcess) {
                    this._scenePassPostProcess = new BABYLON.PassPostProcess("ScenePassPostProcess", 1.0, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this._core.engine, true);
                    for (var j = 0; j < this._core.currentScene.cameras.length; j++)
                        this._core.currentScene.cameras[j].attachPostProcess(this._scenePassPostProcess);
                }
                // Recreate post-processes
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    var id = data.name + EDITOR.SceneFactory.GenerateUUID();
                    BABYLON.Effect.ShadersStore[id + "PixelShader"] = data.program;
                    data.postProcess = new BABYLON.PostProcess(id, id, ["screenSize"], ["originalSampler"], 1.0, this._camera);
                    data.postProcess.onApply = this._postProcessCallback(data.postProcess);
                    if (applyOnScene) {
                        data.mainPostProcess = new BABYLON.PostProcess(id, id, ["screenSize"], ["originalSampler"], 1.0, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this._core.engine, false);
                        data.mainPostProcess.onApply = this._postProcessCallback(data.postProcess, true);
                        for (var j = 0; j < this._core.currentScene.cameras.length; j++)
                            this._core.currentScene.cameras[j].attachPostProcess(data.mainPostProcess);
                    }
                }
                this._storeMetadatas();
            };
            // Removes the given post-process
            PostProcessBuilder.prototype._removePostProcess = function (postProcess, applyOnScene) {
                if (applyOnScene === void 0) { applyOnScene = false; }
                this._camera.detachPostProcess(postProcess);
                if (applyOnScene) {
                    for (var i = 0; i < this._core.currentScene.cameras.length; i++)
                        this._core.currentScene.cameras[i].detachPostProcess(postProcess);
                }
                postProcess.dispose();
            };
            // Callback post-process
            PostProcessBuilder.prototype._postProcessCallback = function (postProcess, applyOnScene) {
                var _this = this;
                if (applyOnScene === void 0) { applyOnScene = false; }
                var screenSize = BABYLON.Vector2.Zero();
                return function (effect) {
                    if (applyOnScene)
                        effect.setTextureFromPostProcess("originalSampler", _this._scenePassPostProcess);
                    else
                        effect.setTexture("originalSampler", _this._texture);
                    screenSize.x = postProcess.width;
                    screenSize.y = postProcess.height;
                    effect.setVector2("screenSize", screenSize);
                };
            };
            // Stores the datas into the custom metadatas
            PostProcessBuilder.prototype._storeMetadatas = function () {
                var customData = [];
                for (var i = 0; i < this._datas.length; i++) {
                    var data = this._datas[i];
                    customData.push({ name: data.name, program: data.program, postProcess: null, mainPostProcess: null });
                }
                EDITOR.SceneManager.AddCustomMetadata("PostProcessBuilder", customData);
            };
            return PostProcessBuilder;
        }());
        EDITOR.PostProcessBuilder = PostProcessBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
