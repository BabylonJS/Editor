var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorMain = (function () {
            /**
            * Constructor
            */
            function EditorMain(containerID, antialias, options) {
                if (antialias === void 0) { antialias = false; }
                if (options === void 0) { options = null; }
                this.layouts = null;
                this.playLayouts = null;
                this.filesInput = null;
                this.renderMainScene = true;
                this.renderHelpers = true;
                // Private members
                this._saveCameraState = false;
                this._mainPanelSceneTab = null;
                this._mainPanelTabs = {};
                this._currentTab = null;
                this._lastTabUsed = null;
                // Initialize
                this.core = new EDITOR.EditorCore();
                this.core.editor = this;
                this.container = containerID;
                this.mainContainer = containerID + "MAIN";
                this.antialias = antialias;
                this.options = options;
                // Create Main UI
                this._createUI();
                this._createBabylonEngine();
                // Register this
                this.core.eventReceivers.push(this);
                // Edition tool
                this.editionTool = new EDITOR.EditionTool(this.core);
                this.editionTool.createUI();
                // Scene graph tool
                this.sceneGraphTool = new EDITOR.SceneGraphTool(this.core);
                this.sceneGraphTool.createUI();
                // Toolbars
                this.mainToolbar = new EDITOR.MainToolbar(this.core);
                this.mainToolbar.createUI();
                this.toolsToolbar = new EDITOR.ToolsToolbar(this.core);
                this.toolsToolbar.createUI();
                this.sceneToolbar = new EDITOR.SceneToolbar(this.core);
                this.sceneToolbar.createUI();
                // Transformer
                this.transformer = new EDITOR.ManipulationHelper(this.core);
                // Scene helpers
                this.SceneHelpers = new EDITOR.SceneHelpers(this.core);
                // Edit panel
                this.editPanel = new EDITOR.EditPanel(this.core);
                // Timeline
                this.timeline = new EDITOR.Timeline(this.core);
                this.timeline.createUI();
                // Status bar
                this.statusBar = new EDITOR.StatusBar(this.core);
                // Files input
                this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
                this.filesInput.monitorElementForDragNDrop(this.core.canvas);
                // Override renderFunction to get full control on the render function
                this.filesInput.renderFunction = function () { };
                // Events
                this._createMainEvents();
            }
            Object.defineProperty(EditorMain, "PlayLayoutContainerID", {
                get: function () {
                    return this._PlayLayoutContainerID;
                },
                enumerable: true,
                configurable: true
            });
            /**
            * Event receiver
            */
            EditorMain.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED && event.guiEvent.caller === this.layouts) {
                        this.playLayouts.resize();
                        this.core.engine.resize();
                        return true;
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED && event.guiEvent.caller === this._mainPanel) {
                        var tabID = event.guiEvent.data;
                        var newMainPanelTab = this._mainPanelTabs[tabID];
                        EDITOR.GUI.GUIElement.CreateTransition(this._currentTab.container, newMainPanelTab.container, "flit-right", function () {
                            _this.layouts.resize();
                            _this.playLayouts.resize();
                            if (newMainPanelTab.application && newMainPanelTab.application.onFocus)
                                newMainPanelTab.application.onFocus();
                        });
                        if (newMainPanelTab.application)
                            newMainPanelTab.application.hasFocus = true;
                        if (this._currentTab.application)
                            this._currentTab.application.hasFocus = false;
                        this._lastTabUsed = this._currentTab;
                        this._currentTab = newMainPanelTab;
                        this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;
                        return false;
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CLOSED && event.guiEvent.caller === this._mainPanel) {
                        var tabID = event.guiEvent.data;
                        var mainPanelTab = this._mainPanelTabs[tabID];
                        this._currentTab = this._lastTabUsed === mainPanelTab ? this._mainPanelSceneTab : this._lastTabUsed;
                        EDITOR.GUI.GUIElement.CreateTransition(mainPanelTab.container, this._currentTab.container, "pop-in", function () {
                            if (mainPanelTab.application) {
                                mainPanelTab.application.dispose();
                            }
                            $("#" + mainPanelTab.container).remove();
                            _this._mainPanel.removeTab(mainPanelTab.tab.id);
                            _this.layouts.resize();
                            _this.playLayouts.resize();
                        });
                        delete this._mainPanelTabs[tabID];
                        this.renderMainScene = this._currentTab.tab === this._mainPanelSceneTab.tab;
                        return false;
                    }
                }
                return false;
            };
            /**
            * Creates a new project
            */
            EditorMain.prototype.createNewProject = function () {
                BABYLON.FilesInput.FilesToLoad = [];
                this.core.currentScene.dispose();
                this._handleSceneLoaded()(null, new BABYLON.Scene(this.core.engine));
            };
            /**
            * Creates the render loop
            */
            EditorMain.prototype.createRenderLoop = function () {
                var _this = this;
                this.core.engine.runRenderLoop(function () {
                    _this.update();
                });
            };
            /**
            * Simply update the scenes and updates
            */
            EditorMain.prototype.update = function () {
                // Show we are loading some things
                if (this.core.currentScene.getWaitingItemsCount() > 0) {
                    if (!this.statusBar.hasElement("WAITING-ITEMS-COUNT-STATUS")) {
                        this.statusBar.addElement("WAITING-ITEMS-COUNT-STATUS", "0", null);
                        this.statusBar.showSpinner("WAITING-ITEMS-COUNT-STATUS");
                    }
                    this.statusBar.setText("WAITING-ITEMS-COUNT-STATUS", "Loading " + this.core.currentScene.getWaitingItemsCount() + " items...");
                }
                else
                    this.statusBar.removeElement("WAITING-ITEMS-COUNT-STATUS");
                // Pre update
                this.core.onPreUpdate();
                // Scenes
                if (this.renderMainScene) {
                    for (var i = 0; i < this.core.scenes.length; i++) {
                        if (this.core.scenes[i].render) {
                            this.core.scenes[i].scene.render();
                        }
                    }
                }
                // Render transformer
                this.transformer.getScene().render();
                this.SceneHelpers.getScene().render();
                // Post update
                this.core.onPostUpdate();
            };
            /**
            * Disposes the editor
            */
            EditorMain.prototype.dispose = function () {
            };
            /**
            * Reloads the scene
            */
            EditorMain.prototype.reloadScene = function (saveCameraState, data) {
                this._saveCameraState = saveCameraState;
                if (data)
                    this.filesInput.loadFiles(data);
                else
                    this.filesInput.reload();
            };
            /**
            * Creates a new tab
            */
            EditorMain.prototype.createTab = function (caption, container, application, closable) {
                if (closable === void 0) { closable = true; }
                var tab = {
                    caption: caption,
                    id: EDITOR.SceneFactory.GenerateUUID(),
                    closable: closable
                };
                this._mainPanel.createTab(tab);
                this._mainPanelTabs[tab.id] = {
                    tab: tab,
                    container: container,
                    application: application
                };
                if (!this._currentTab)
                    this._currentTab = this._mainPanelTabs[tab.id];
                this._mainPanel.setActiveTab(tab.id);
                return tab;
            };
            /**
            * Removes the given tab
            */
            EditorMain.prototype.removeTab = function (tab) {
                return this._mainPanel.removeTab(tab.id);
            };
            /**
            * Adds a new container and returns its id
            */
            EditorMain.prototype.createContainer = function () {
                var id = EDITOR.SceneFactory.GenerateUUID();
                $("#" + EditorMain._PlayLayoutContainerID).append(EDITOR.GUI.GUIElement.CreateDivElement(id, "width: 100%; height: 100%;"));
                return id;
            };
            /**
            * Removes the given continer
            */
            EditorMain.prototype.removeContainer = function (id) {
                var container = $("#" + id);
                container.remove();
            };
            /**
            * Creates the UI
            */
            EditorMain.prototype._createUI = function () {
                var _this = this;
                // Layouts
                this.layouts = new EDITOR.GUI.GUILayout(this.container, this.core);
                this.layouts.createPanel("BABYLON-EDITOR-EDITION-TOOL-PANEL", "left", 380, true).setContent("<div id=\"BABYLON-EDITOR-EDITION-TOOL\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent("<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50%\"></div>" +
                    "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50%\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
                var mainPanel = this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"" + this.mainContainer + "\" style=\"height: 100%; width: 100%;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("<div style=\"width: 100%; height: 100%; overflow: hidden;\">" +
                    "<div id=\"BABYLON-EDITOR-PREVIEW-PANEL\" style=\"height: 100%;\"></div>" +
                    "</div>");
                this.layouts.createPanel("BABYLON-EDITOR-BOTTOM-PANEL", "bottom", 0, false).setContent("<div id=\"BABYLON-EDITOR-BOTTOM-PANEL\" style=\"height: 100%; width: 100%\"></div>");
                this.layouts.buildElement(this.container);
                // Play Layouts
                this.playLayouts = new EDITOR.GUI.GUILayout(this.mainContainer, this.core);
                var mainPanel = this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"" + EditorMain._PlayLayoutContainerID + "\" style=\"width: 100%; height: 100%;\">" +
                    "<div id=\"BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW\">" +
                    //"<div id=\"BABYLON-EDITOR-MAIN-DEBUG-LAYER\"></div>" +
                    "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>" +
                    "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                    "</div>" +
                    "</div>");
                mainPanel.style = "overflow: hidden;";
                this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-PREVIEW-PANEL", "preview", 0, false).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-TIMELINE\" style=\"height: 100%; width: 100%; overflow: hidden;\"></div>");
                this.playLayouts.buildElement(this.mainContainer);
                this.playLayouts.on({ execute: "after", type: "resize" }, function () {
                    if (!_this.sceneToolbar)
                        return;
                    var panelHeight = _this.layouts.getPanelFromType("main").height;
                    var toolbarHeight = _this.sceneToolbar.toolbar.element.box.clientHeight;
                    _this.core.canvas.height = (panelHeight - toolbarHeight * 2.0 - 10 - _this.playLayouts.getPanelFromType("preview").height) * devicePixelRatio;
                });
                this._mainPanel = this.playLayouts.getPanelFromType("main");
                this._mainPanelSceneTab = this._mainPanelTabs[this.createTab("Preview", "BABYLON-EDITOR-BOTTOM-PANEL-PREVIEW", null, false).id];
            };
            /**
            * Handles just opened scenes
            */
            EditorMain.prototype._handleSceneLoaded = function () {
                var _this = this;
                return function (file, scene) {
                    // Close already opened tabs
                    for (var thing in _this._mainPanelTabs) {
                        if (_this._mainPanelTabs[thing].tab.id !== _this._mainPanelSceneTab.tab.id)
                            EDITOR.Event.sendGUIEvent(_this._mainPanel, EDITOR.GUIEventType.TAB_CLOSED, _this.core, _this._mainPanelTabs[thing].tab.id);
                    }
                    // Set active scene
                    _this.core.removeScene(_this.core.currentScene);
                    _this.core.scenes.push({ scene: scene, render: true });
                    _this.core.currentScene = scene;
                    // Attach control to cameras
                    for (var i = 0; i < scene.cameras.length; i++) {
                        scene.cameras[i].attachControl(_this.core.canvas, true);
                    }
                    // Set active camera
                    var camera = scene.activeCamera;
                    _this._createBabylonCamera();
                    if (camera) {
                        if (camera.speed) {
                            _this.core.camera.speed = camera.speed;
                        }
                    }
                    _this.core.currentScene.activeCamera = _this.core.camera;
                    _this.core.playCamera = camera;
                    // Set 2D scene
                    _this.core.removeScene(_this.core.scene2d);
                    _this.core.scenes.push({ scene: _this.core.scene2d, render: true });
                    // Create render loop
                    _this.core.engine.stopRenderLoop();
                    _this.createRenderLoop();
                    // Create parent node
                    var parent = null;
                    // Configure meshes
                    for (var i = 0; i < scene.meshes.length; i++) {
                        EDITOR.SceneManager.ConfigureObject(scene.meshes[i], _this.core, parent, false);
                    }
                    // Configure scene
                    EDITOR.SceneManager._SceneConfiguration = {
                        scene: scene,
                        actionManager: scene.actionManager
                    };
                    scene.actionManager = null;
                    // Physics
                    if (scene.getPhysicsEngine())
                        scene.getPhysicsEngine().setTimeStep(0);
                    // Reset UI
                    _this.sceneGraphTool.createUI();
                    _this.sceneGraphTool.fillGraph();
                    EDITOR.SceneFactory.NodesToStart = [];
                    _this.timeline.reset();
                    EDITOR.Event.sendSceneEvent(_this.core.currentScene, EDITOR.SceneEventType.NEW_SCENE_CREATED, _this.core);
                };
            };
            /**
            * Creates the babylon engine
            */
            EditorMain.prototype._createBabylonEngine = function () {
                var _this = this;
                this.core.canvas = document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");
                this.core.engine = new BABYLON.Engine(this.core.canvas, this.antialias, this.options);
                this.core.engine.setHardwareScalingLevel(1.0 / devicePixelRatio);
                // Main scene
                this.core.currentScene = new BABYLON.Scene(this.core.engine);
                this.core.currentScene.animations = [];
                this.core.scenes.push({ render: true, scene: this.core.currentScene });
                this._createBabylonCamera();
                // Create 2D scene
                this.core.scene2d = new BABYLON.Scene(this.core.engine);
                this.core.scene2d.activeCamera = new BABYLON.Camera("Camera2D", BABYLON.Vector3.Zero(), this.core.scene2d);
                this.core.scene2d.activeCamera.fov = 0;
                this.core.scene2d.autoClear = false;
                this.core.scene2d.clearColor = new BABYLON.Color4(0, 0, 0, 0);
                this.core.scenes.push({ render: true, scene: this.core.scene2d });
                // Events
                window.addEventListener("resize", function (ev) {
                    if (_this.core.isPlaying) {
                        _this.core.isPlaying = false;
                    }
                    _this.core.engine.resize();
                });
            };
            /**
            * Creates the editor camera
            */
            EditorMain.prototype._createBabylonCamera = function () {
                var cameraPosition = new BABYLON.Vector3(0, 0, 10);
                var cameraTarget = BABYLON.Vector3.Zero();
                var cameraRadius = 10;
                if (this.core.camera) {
                    cameraPosition = this.core.camera.position;
                    cameraTarget = this.core.camera.target;
                    cameraRadius = this.core.camera.radius;
                }
                var camera = new BABYLON.ArcRotateCamera("EditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this.core.currentScene);
                camera.panningSensibility = 50;
                camera.attachControl(this.core.canvas, false, false);
                this.core.camera = camera;
                if (this._saveCameraState) {
                    camera.setPosition(cameraPosition);
                    camera.setTarget(cameraTarget);
                    camera.radius = cameraRadius;
                }
            };
            /**
            * Creates the main events (on "document")
            */
            EditorMain.prototype._createMainEvents = function () {
                var _this = this;
                document.addEventListener("mousedown", function (event) {
                    EDITOR.Event.sendGUIEvent(null, EDITOR.GUIEventType.DOCUMENT_CLICK, _this.core, event);
                });
                document.addEventListener("mouseup", function (event) {
                    EDITOR.Event.sendGUIEvent(null, EDITOR.GUIEventType.DOCUMENT_UNCLICK, _this.core, event);
                });
                document.addEventListener("keydown", function (event) {
                    EDITOR.Event.sendKeyEvent(event.key, event.ctrlKey, event.shiftKey, true, _this.core, event);
                });
                document.addEventListener("keyup", function (event) {
                    EDITOR.Event.sendKeyEvent(event.key, event.ctrlKey, event.shiftKey, false, _this.core, event);
                });
            };
            return EditorMain;
        }());
        // Statics
        EditorMain._PlayLayoutContainerID = "BABYLON-EDITOR-MAIN-MAIN-PANEL-CONTAINER";
        EDITOR.EditorMain = EditorMain;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.main.js.map
