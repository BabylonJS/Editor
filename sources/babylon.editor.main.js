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
                this.transformer = new EDITOR.Transformer(this.core);
                // Edit panel
                this.editPanel = new EDITOR.EditPanel(this.core);
                // Timeline
                this.timeline = new EDITOR.Timeline(this.core);
                this.timeline.createUI();
                // Files input
                this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
                this.filesInput.monitorElementForDragNDrop(this.core.canvas);
                // Override renderFunction to get full control on the render function
                this.filesInput.renderFunction = function () { };
            }
            Object.defineProperty(EditorMain, "DummyNodeID", {
                // private members
                // Statics
                get: function () {
                    return "BABYLON-EDITOR-DUMMY-NODE";
                },
                enumerable: true,
                configurable: true
            });
            /**
            * Event receiver
            */
            EditorMain.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        this.core.engine.resize();
                        return true;
                    }
                }
                return false;
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
                this.layouts.createPanel("BABYLON-EDITOR-BOTTOM-PANEL", "bottom", 0, false).setContent("<div id=\"BABYLON-EDITOR-BOTTOM-PANEL\" style=\"height: 100%;\"></div>");
                this.layouts.buildElement(this.container);
                // Play Layouts
                this.playLayouts = new EDITOR.GUI.GUILayout(this.mainContainer, this.core);
                var mainPanel = this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-MAIN-PANEL", "main", undefined, undefined).setContent(
                //"<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>" +
                    "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>");
                mainPanel.style = "overflow: hidden;";
                this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-PREVIEW-PANEL", "preview", 0, false).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-TIMELINE\" style=\"height: 100%; width: 100%; overflow: hidden;\"></div>");
                this.playLayouts.buildElement(this.mainContainer);
                this.playLayouts.on({ execute: "after", type: "resize" }, function () {
                    var panelHeight = _this.layouts.getPanelFromType("main").height;
                    var toolbarHeight = _this.sceneToolbar.toolbar.element.box.clientHeight;
                    _this.core.canvas.height = panelHeight - toolbarHeight * 1.5 - _this.playLayouts.getPanelFromType("preview").height;
                });
            };
            /**
            * Handles just opened scenes
            */
            EditorMain.prototype._handleSceneLoaded = function () {
                var _this = this;
                return function (file, scene) {
                    // Set active scene
                    _this.core.removeScene(_this.core.currentScene);
                    _this.core.scenes.push({ scene: scene, render: true });
                    _this.core.currentScene = scene;
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
                    // Create render loop
                    _this.core.engine.stopRenderLoop();
                    _this.createRenderLoop();
                    // Create parent node
                    var parent = null;
                    // Configure meshes
                    for (var i = 0; i < scene.meshes.length; i++) {
                        EDITOR.SceneManager.ConfigureObject(scene.meshes[i], _this.core, parent);
                    }
                    // Reset UI
                    _this.sceneGraphTool.createUI();
                    _this.sceneGraphTool.fillGraph();
                    EDITOR.SceneFactory.NodesToStart = [];
                    _this.timeline.reset();
                };
            };
            /**
            * Creates the babylon engine
            */
            EditorMain.prototype._createBabylonEngine = function () {
                var _this = this;
                this.core.canvas = document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");
                this.core.engine = new BABYLON.Engine(this.core.canvas, this.antialias, this.options);
                this.core.currentScene = new BABYLON.Scene(this.core.engine);
                this.core.currentScene.animations = [];
                this.core.scenes.push({ render: true, scene: this.core.currentScene });
                this._createBabylonCamera();
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
                var camera = new BABYLON.ArcRotateCamera("EditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this.core.currentScene);
                camera.panningSensibility = 50;
                camera.attachControl(this.core.canvas, false, false);
                this.core.camera = camera;
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
                // Post update
                this.core.onPostUpdate();
            };
            // Disposes the editor
            EditorMain.prototype.dispose = function () {
            };
            return EditorMain;
        })();
        EDITOR.EditorMain = EditorMain;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
