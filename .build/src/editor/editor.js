"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var core_1 = require("./core");
var layout_1 = require("./gui/layout");
var dialog_1 = require("./gui/dialog");
var toolbar_1 = require("./components/toolbar");
var graph_1 = require("./components/graph");
var edition_1 = require("./components/edition");
var edit_panel_1 = require("./components/edit-panel");
var scene_picker_1 = require("./scene/scene-picker");
var scene_manager_1 = require("./scene/scene-manager");
var scene_preview_1 = require("./scene/scene-preview");
var scene_importer_1 = require("./scene/scene-importer");
var scene_icons_1 = require("./scene/scene-icons");
var tools_1 = require("./tools/tools");
var default_scene_1 = require("./tools/default-scene");
var undo_redo_1 = require("./tools/undo-redo");
var GoldenLayout = require("golden-layout");
var Editor = /** @class */ (function () {
    /**
     * Constructor
     * @param scene: a scene to edit. If undefined, a default scene will be created
     */
    function Editor(scene) {
        var _this = this;
        this.playCamera = null;
        this.plugins = {};
        this.sceneFile = null;
        this.projectFile = null;
        this._showReloadDialog = true;
        this.layoutManagerConfig = {
            settings: {
                showPopoutIcon: false,
                showCloseIcon: false
            },
            dimensions: {
                borderWidth: 2,
                minItemHeight: 220,
                minItemWidth: 240,
                headerHeight: 20,
                dragProxyWidth: 0,
                dragProxyHeight: 200
            },
            labels: {
                close: 'close',
                maximise: 'maximise',
                minimise: 'minimise',
                popout: 'open in new window'
            },
            content: [{
                    type: 'row',
                    content: [{
                            type: 'component',
                            componentName: 'Properties',
                            width: 21,
                            isClosable: false
                        }, {
                            type: 'column',
                            content: [{
                                    type: 'component',
                                    componentName: 'Scene View',
                                    isClosable: false
                                },
                                {
                                    type: 'stack',
                                    componentName: 'AdditionalDialogue',
                                    id: "SceneRow",
                                    height: 0,
                                    isClosable: false
                                }
                            ],
                            width: 57,
                            isClosable: false
                        },
                        {
                            type: 'component',
                            componentName: 'Scene Outliner',
                            width: 22,
                            isClosable: false
                        }
                    ]
                }]
        };
        this.layoutManager = new GoldenLayout(this.layoutManagerConfig);
        this.layoutManager.registerComponent('Scene Outliner', function (container) {
            container.getElement().html("<div class=\"sceneOutliner\"><input id=\"jstree_search\" type=\"text\" placeholder=\"Search\" />  <div id=\"jstree\"/> </div>");
        });
        this.layoutManager.registerComponent('Scene View', function (container) {
            container.getElement().html('<canvas id="renderCanvas" width="412" height="132" tabindex="1" style=""></canvas>');
        });
        this.layoutManager.on('stateChanged', function (component) {
            if (_this.layoutManager.root.getItemsById('SceneRow')[0].contentItems.length > 0) {
                if (_this.layoutManager.root.getItemsById('SceneRow')[0].config.height == 0) {
                    _this.layoutManager.root.getItemsById('SceneRow')[0].config.height = 50;
                    _this.layoutManager.updateSize();
                }
            }
            else {
                _this.layoutManager.root.getItemsById('SceneRow')[0].config.height = 0;
                _this.layoutManager.updateSize();
            }
            _this.resize();
        });
        window.addEventListener('resize', function () {
            _this.resize();
        });
        this.layoutManager.registerComponent('Properties', function (container) {
            container.getElement().html(' <div id="EDIT-PANEL-TOOLS" style="height: 100%; width: 100%" /> ');
        });
        this.layoutManager.init();
        // Create Widget (toolbar)
        this.layoutToolbar = new layout_1.default('BABYLON-EDITOR-TOOLBAR');
        this.layoutToolbar.panels = [
            {
                type: 'top',
                size: 55,
                content: '<div id="MAIN-TOOLBAR" style="width: 100%; height: 50%;"></div><div id="TOOLS-TOOLBAR" style="width: 100%; height: 50%;"></div>',
                resizable: false
            }
        ];
        this.layoutToolbar.build('BABYLON-EDITOR-TOOLBAR');
        // Create Widget (Properties)
        this.layout = new layout_1.default('EDIT-PANEL-TOOLS');
        this.layout.panels = [
            { type: 'left',
                hidden: false,
                size: 310,
                style: "height: 100%",
                overflow: "unset",
                content: '<div id="EDITION" style="width: 100%; height: 100%;"></div>',
                resizable: false,
                tabs: [] },
        ];
        this.layout.build('EDIT-PANEL-TOOLS');
        // Initialize core
        this.core = new core_1.default();
        // Create toolbar
        this.toolbar = new toolbar_1.default(this);
        // Create edition tools
        this.edition = new edition_1.default(this);
        // Create graph
        this.graph = new graph_1.default(this);
        // Edit panel
        this.editPanel = new edit_panel_1.default(this);
        // Initialize Babylon.js
        if (!scene) {
            var canvas = document.getElementById('renderCanvas');
            this.core.engine = new babylonjs_1.Engine(canvas, true);
            this.core.scene = new babylonjs_1.Scene(this.core.engine);
            this.core.scenes.push(this.core.scene);
        }
        else {
            this.core.engine = scene.getEngine();
            this.core.scenes.push(scene);
            this.core.scene = scene;
        }
        this.graph.currentObject = this.core.scene;
        // Create editor camera
        this.createEditorCamera();
        // Create files input
        this._createFilesInput();
        // Create scene icons
        this.sceneIcons = new scene_icons_1.default(this);
        // Create scene picker
        this._createScenePicker();
        // Handle events
        this._handleEvents();
    }
    /**
     * Runs the editor and Babylon.js engine
     */
    Editor.prototype.run = function () {
        var _this = this;
        this.core.engine.runRenderLoop(function () {
            _this.core.update();
        });
    };
    /**
    * Resizes elements
    */
    Editor.prototype.resize = function () {
        if (this.core) {
            this.core.engine.resize();
            // Notify
            this.core.onResize.notifyObservers(null);
        }
    };
    /**
     * Adds an "edit panel" plugin
     * @param url the URL of the plugin
     * @param restart: if to restart the plugin
     * @param name: the name of the plugin to show
     * @param params: the params to give to the plugin's constructor
     */
    Editor.prototype.addEditPanelPlugin = function (url, restart, name) {
        if (restart === void 0) { restart = false; }
        var params = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            params[_i - 3] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var plugin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.plugins[url]) {
                            if (restart)
                                this.removePlugin(this.plugins[url]);
                            else {
                                this.editPanel.showPlugin.apply(this.editPanel, [this.plugins[url]].concat(params));
                                return [2 /*return*/, this.plugins[url]];
                            }
                        }
                        return [4 /*yield*/, this._runPlugin.apply(this, [url].concat(params))];
                    case 1:
                        plugin = _a.sent();
                        this.plugins[url] = plugin;
                        // Add tab in edit panel
                        this.editPanel.addPlugin(plugin);
                        // Create plugin
                        return [4 /*yield*/, plugin.create()];
                    case 2:
                        // Create plugin
                        _a.sent();
                        return [2 /*return*/, plugin];
                }
            });
        });
    };
    /**
     * Removes the given plugin
     * @param plugin: the plugin to remove
     */
    Editor.prototype.removePlugin = function (plugin) {
        return __awaiter(this, void 0, void 0, function () {
            var p;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, plugin.close()];
                    case 1:
                        _a.sent();
                        plugin.divElement.remove();
                        this.editPanel.panel.tabs.remove(plugin.name);
                        for (p in this.plugins) {
                            if (this.plugins[p] === plugin) {
                                delete this.plugins[p];
                                break;
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Restarts the plugins already loaded
     */
    Editor.prototype.restartPlugins = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _i, p, plugin;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = [];
                        for (_b in this.plugins)
                            _a.push(_b);
                        _i = 0;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        p = _a[_i];
                        plugin = this.plugins[p];
                        return [4 /*yield*/, this.removePlugin(plugin)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.addEditPanelPlugin(p, false, plugin.name)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates the default scene
     * @param showNewSceneDialog: if to show a dialog to confirm creating default scene
     */
    Editor.prototype.createDefaultScene = function (showNewSceneDialog) {
        if (showNewSceneDialog === void 0) { showNewSceneDialog = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var callback;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        callback = function () { return __awaiter(_this, void 0, void 0, function () {
                            var _this = this;
                            var promises;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        // Create default scene
                                        default_scene_1.default.Create(this).then(function () {
                                            _this.graph.clear();
                                            _this.graph.fill();
                                        });
                                        this.core.onSelectObject.notifyObservers(this.core.scene);
                                        // List scene preview
                                        if (tools_1.default.IsElectron())
                                            scene_preview_1.default.Create();
                                        // Restart plugins
                                        return [4 /*yield*/, this.restartPlugins()];
                                    case 1:
                                        // Restart plugins
                                        _a.sent();
                                        promises = [];
                                        return [4 /*yield*/, Promise.all(promises)];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        if (!!showNewSceneDialog) return [3 /*break*/, 2];
                        return [4 /*yield*/, callback()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        dialog_1.default.Create('Create a new scene?', 'Remove current scene and create a new one?', function (result) { return __awaiter(_this, void 0, void 0, function () {
                            var scene;
                            return __generator(this, function (_a) {
                                if (result === 'Yes') {
                                    undo_redo_1.default.Clear();
                                    this.core.scene.dispose();
                                    this.core.removeScene(this.core.scene);
                                    this.core.uiTextures.forEach(function (ui) { return ui.dispose(); });
                                    scene = new babylonjs_1.Scene(this.core.engine);
                                    this.core.scene = scene;
                                    this.core.scenes.push(scene);
                                    this.createEditorCamera();
                                    // Create default scene
                                    callback();
                                }
                                return [2 /*return*/];
                            });
                        }); });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates the editor camera
     */
    Editor.prototype.createEditorCamera = function () {
        var _this = this;
        // Editor camera
        this.camera = new babylonjs_1.FreeCamera('Editor Camera', this.core.scene.activeCamera ? this.core.scene.activeCamera.position : new babylonjs_1.Vector3(0, 5, 25), this.core.scene);
        this.camera.speed = 0.5;
        this.camera.angularSensibility = 3000;
        this.camera.setTarget(new babylonjs_1.Vector3(0, 5, 24));
        this.camera.maxZ = 10000;
        this.camera.attachControl(this.core.engine.getRenderingCanvas(), true);
        // Traditional WASD controls
        this.camera.keysUp.push(87); //  "W"
        this.camera.keysLeft.push(65); //"A"
        this.camera.keysDown.push(83); //"S"
        this.camera.keysRight.push(68); //"D"
        // Define target property on FreeCamera
        Object.defineProperty(this.camera, 'target', {
            get: function () { return _this.camera.getTarget(); },
            set: function (v) { return _this.camera.setTarget(v); }
        });
        // Set as active camera
        this.core.scene.activeCamera = this.camera;
        return this.camera;
    };
    // Handles the events of the editor
    Editor.prototype._handleEvents = function () {
        var _this = this;
        // Undo
        undo_redo_1.default.onUndo = function (e) { return _this.core.onGlobalPropertyChange.notifyObservers({ object: e.object, property: e.property, value: e.to, initialValue: e.from }); };
        document.addEventListener('keyup', function (ev) {
            if (ev.ctrlKey && ev.key === 'z') {
                undo_redo_1.default.Undo();
                _this.edition.updateDisplay();
            }
        });
        // Redo
        undo_redo_1.default.onRedo = function (e) { return _this.core.onGlobalPropertyChange.notifyObservers({ object: e.object, property: e.property, value: e.to, initialValue: e.from }); };
        document.addEventListener('keyup', function (ev) {
            if (ev.ctrlKey && ev.key === 'y') {
                undo_redo_1.default.Redo();
                _this.edition.updateDisplay();
            }
        });
    };
    // Runs the given plugin URL
    Editor.prototype._runPlugin = function (url) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var plugin, args, instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tools_1.default.ImportScript(url)];
                    case 1:
                        plugin = _a.sent();
                        args = [plugin.default, this].concat(params);
                        instance = new (Function.prototype.bind.apply(plugin.default, args));
                        // Create DOM elements
                        instance.divElement = tools_1.default.CreateElement('div', instance.name.replace(/ /, ''), {
                            width: '100%',
                            height: '100%'
                        });
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    // Creates the files input class and handlers
    Editor.prototype._createFilesInput = function () {
        var _this = this;
        // Add files input
        this.filesInput = new babylonjs_1.FilesInput(this.core.engine, null, null, function () {
        }, null, function (remaining) {
            // Loading textures
        }, function () {
            // Starting process
        }, function (file) {
            // Callback
            var callback = function (scene) { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, _i, f, file_1, content;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            // Configure editor
                            this.core.removeScene(this.core.scene);
                            this.core.uiTextures.forEach(function (ui) { return ui.dispose(); });
                            this.core.scene = scene;
                            this.core.scenes.push(scene);
                            this.playCamera = scene.activeCamera;
                            this.createEditorCamera();
                            this.core.onSelectObject.notifyObservers(this.core.scene);
                            _a = [];
                            for (_b in babylonjs_1.FilesInput.FilesToLoad)
                                _a.push(_b);
                            _i = 0;
                            _c.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            f = _a[_i];
                            file_1 = babylonjs_1.FilesInput.FilesToLoad[f];
                            if (!(tools_1.default.GetFileExtension(file_1.name) === 'editorproject')) return [3 /*break*/, 4];
                            return [4 /*yield*/, tools_1.default.ReadFileAsText(file_1)];
                        case 2:
                            content = _c.sent();
                            return [4 /*yield*/, scene_importer_1.default.Import(this, JSON.parse(content))];
                        case 3:
                            _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _i++;
                            return [3 /*break*/, 1];
                        case 5:
                            // Default light
                            if (scene.lights.length === 0)
                                scene.createDefaultCameraOrLight(false, false, false);
                            // Graph
                            this.graph.clear();
                            this.graph.fill(scene);
                            // Restart plugins
                            this.restartPlugins();
                            // Create scene picker
                            this._createScenePicker();
                            // Toggle interactions (action manager, etc.)
                            scene_manager_1.default.Clear();
                            scene_manager_1.default.Toggle(this.core.scene);
                            // Run scene
                            this.run();
                            return [2 /*return*/];
                    }
                });
            }); };
            var dialogCallback = function (doNotAppend) { return __awaiter(_this, void 0, void 0, function () {
                var extension;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            // Clear undo / redo
                            undo_redo_1.default.Clear();
                            extension = tools_1.default.GetFileExtension(file.name);
                            if (!(extension !== 'babylon')) return [3 /*break*/, 2];
                            this.layout.lockPanel('main', 'Importing Loaders...', true);
                            return [4 /*yield*/, tools_1.default.ImportScript('babylonjs-loaders')];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            this.layout.lockPanel('main', 'Importing Physics...', true);
                            return [4 /*yield*/, tools_1.default.ImportScript('cannonjs')];
                        case 3:
                            _a.sent();
                            this.layout.lockPanel('main', 'Importing Materials...', true);
                            return [4 /*yield*/, tools_1.default.ImportScript('babylonjs-materials')];
                        case 4:
                            _a.sent();
                            // Import extensions
                            this.layout.lockPanel('main', 'Importing Extensions...', true);
                            return [4 /*yield*/, Promise.all([
                                    tools_1.default.ImportScript('behavior-editor'),
                                    tools_1.default.ImportScript('material-creator'),
                                    tools_1.default.ImportScript('post-process-creator'),
                                    tools_1.default.ImportScript('post-processes')
                                ])];
                        case 5:
                            _a.sent();
                            this.layout.unlockPanel('main');
                            // Stop render loop
                            this.core.engine.stopRenderLoop();
                            // Load scene
                            if (doNotAppend)
                                babylonjs_1.SceneLoader.Load('file:', file, this.core.engine, function (scene) { return callback(scene); });
                            else
                                babylonjs_1.SceneLoader.Append('file:', file, this.core.scene, function (scene) { return callback(scene); });
                            // Delete start scene (when starting the editor) and add new scene
                            delete babylonjs_1.FilesInput.FilesToLoad['scene.babylon'];
                            babylonjs_1.FilesInput.FilesToLoad[file.name] = file;
                            return [2 /*return*/];
                    }
                });
            }); };
            if (_this._showReloadDialog)
                dialog_1.default.Create('Load scene', 'Append to existing one?', function (result) { return dialogCallback(result === 'No'); });
            else
                dialogCallback(false);
            _this._showReloadDialog = true;
        }, function (file, scene, message) {
            // Error callback
            dialog_1.default.Create('Error when loading scene', message, null);
        });
        this.filesInput.monitorElementForDragNDrop(document.getElementById('renderCanvas'));
    };
    // Creates the scene picker
    Editor.prototype._createScenePicker = function () {
        var _this = this;
        if (this.scenePicker)
            this.scenePicker.remove();
        this.scenePicker = new scene_picker_1.default(this, this.core.scene, this.core.engine.getRenderingCanvas());
        this.scenePicker.onPickedMesh = function (m) { return _this.core.onSelectObject.notifyObservers(m); };
    };
    return Editor;
}());
exports.default = Editor;
//# sourceMappingURL=editor.js.map