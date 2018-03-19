"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var babylonjs_editor_1 = require("babylonjs-editor");
var extensions_1 = require("../../extensions/extensions");
require("../../extensions/post-process-creator/post-process-creator");
var post_process_1 = require("../../extensions/post-process-creator/post-process");
var PostProcessCreator = /** @class */ (function (_super) {
    __extends(PostProcessCreator, _super);
    /**
     * Constructor
     * @param name: the name of the plugin
     */
    function PostProcessCreator(editor) {
        var _this = _super.call(this, 'Post-Process Creator') || this;
        _this.editor = editor;
        // Public members
        _this.layout = null;
        _this.toolbar = null;
        _this.grid = null;
        // Protected members
        _this.currentTab = 'POST-PROCESS-CREATOR-EDITOR-CODE';
        _this.code = null;
        _this.pixel = null;
        _this.config = null;
        _this.datas = [];
        _this.data = null;
        _this.activeCamera = _this.editor.playCamera;
        return _this;
    }
    /**
     * Closes the plugin
     */
    PostProcessCreator.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.layout.element.destroy();
                        this.toolbar.element.destroy();
                        this.grid.element.destroy();
                        this.code.editor.dispose();
                        this.pixel.editor.dispose();
                        this.config.editor.dispose();
                        return [4 /*yield*/, _super.prototype.close.call(this)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates the plugin
     */
    PostProcessCreator.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        // Template
                        _a = !PostProcessCreator.DefaultCode;
                        if (!_a) 
                        // Template
                        return [3 /*break*/, 2];
                        _b = PostProcessCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/post-process-creator/class.js')];
                    case 1:
                        _a = (_b.DefaultCode = _g.sent());
                        _g.label = 2;
                    case 2:
                        // Template
                        _a;
                        _c = !PostProcessCreator.DefaultPixel;
                        if (!_c) return [3 /*break*/, 4];
                        _d = PostProcessCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/post-process-creator/pixel.fx')];
                    case 3:
                        _c = (_d.DefaultPixel = _g.sent());
                        _g.label = 4;
                    case 4:
                        _c;
                        _e = !PostProcessCreator.DefaultConfig;
                        if (!_e) return [3 /*break*/, 6];
                        _f = PostProcessCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/post-process-creator/config.json')];
                    case 5:
                        _e = (_f.DefaultConfig = _g.sent());
                        _g.label = 6;
                    case 6:
                        _e;
                        // Request extension
                        extensions_1.default.RequestExtension(this.editor.core.scene, 'PostProcessCreatorExtension');
                        // Metadatas
                        this.editor.core.scene.metadata = this.editor.core.scene.metadata || {};
                        if (!this.editor.core.scene.metadata['PostProcessCreator']) {
                            this.editor.core.scene.metadata['PostProcessCreator'] = [{
                                    name: 'Custom Post-Process',
                                    cameraName: this.activeCamera ? this.activeCamera.name : null,
                                    code: PostProcessCreator.DefaultCode,
                                    pixel: PostProcessCreator.DefaultPixel,
                                    config: PostProcessCreator.DefaultConfig,
                                    userConfig: {}
                                }];
                        }
                        this.datas = this.editor.core.scene.metadata['PostProcessCreator'];
                        this.data = this.datas[0];
                        this.datas.forEach(function (d) { return _this.createOrUpdatePostProcess(d.name); });
                        // Create layout
                        this.layout = new babylonjs_editor_1.Layout('PostProcessCreatorCode');
                        this.layout.panels = [
                            { type: 'top', content: '<div id="POST-PROCESS-CREATOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: 32, overflow: 'auto', resizable: true },
                            { type: 'left', content: '<div id="POST-PROCESS-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
                            {
                                type: 'main',
                                content: "\n                    <div id=\"POST-PROCESS-CREATOR-EDITOR-CODE\" style=\"width: 100%; height: 100%;\"></div>\n                    <div id=\"POST-PROCESS-CREATOR-EDITOR-PIXEL\" style=\"width: 100%; height: 100%; display: none;\"></div>\n                    <div id=\"POST-PROCESS-CREATOR-EDITOR-CONFIG\" style=\"width: 100%; height: 100%; display: none;\"></div>\n                ",
                                resizable: true,
                                tabs: [
                                    { id: 'code', caption: 'Code' },
                                    { id: 'pixel', caption: 'Pixel' },
                                    { id: 'config', caption: 'Config' }
                                ]
                            }
                        ];
                        this.layout.build(this.divElement.id);
                        // Create toolbar
                        this.toolbar = new babylonjs_editor_1.Toolbar('PostProcessCreatorToolbar');
                        this.toolbar.items = [
                            { id: 'project', type: 'menu', caption: 'Project', img: 'icon-folder', items: [
                                    { id: 'add', caption: 'Add Existing Project...', img: 'icon-export' },
                                    { id: 'download', caption: 'Download Project...', img: 'icon-export' }
                                ] }
                        ];
                        this.toolbar.build('POST-PROCESS-CREATOR-TOOLBAR');
                        // Create grid
                        this.grid = new babylonjs_editor_1.Grid('PostProcessCreatorGrid', {
                            toolbarReload: false,
                            toolbarEdit: false,
                            toolbarSearch: false
                        });
                        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
                        this.grid.build('POST-PROCESS-CREATOR-LIST');
                        this.grid.onAdd = function () { return _this.addPostProcess(); };
                        this.grid.onDelete = function (selected) { return _this.datas.splice(selected[0], 1); };
                        this.grid.onChange = function (selected, value) { return _this.changePostProcess(selected, value); };
                        this.grid.onClick = function (selected) { return _this.selectPostProcess(selected[0]); };
                        this.datas.forEach(function (d, index) { return _this.grid.addRecord({
                            name: d.name,
                            recid: index
                        }); });
                        this.grid.element.refresh();
                        this.grid.select([0]);
                        // Add code editors
                        return [4 /*yield*/, this.createEditors()];
                    case 7:
                        // Add code editors
                        _g.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * On the user shows the plugin
     */
    PostProcessCreator.prototype.onShow = function () {
        this.grid.element.resize();
    };
    /**
     * Creates a new post-process
     */
    PostProcessCreator.prototype.addPostProcess = function () {
        // Create data and material
        var data = {
            cameraName: this.activeCamera ? this.activeCamera.name : null,
            name: 'Custom Post-Process' + this.datas.length + 1,
            code: PostProcessCreator.DefaultCode,
            pixel: PostProcessCreator.DefaultPixel,
            config: PostProcessCreator.DefaultConfig,
            userConfig: {}
        };
        // Collect and add to the list
        this.datas.push(data);
        this.grid.addRow({
            name: data.name,
            recid: this.grid.element.records.length - 1
        });
        // Add and select
        var p = this.createOrUpdatePostProcess(data.name);
        this.editor.core.onSelectObject.notifyObservers(p);
    };
    /**
     * Creates or updates the given post-process name
     * @param name: the name of the post-process
     */
    PostProcessCreator.prototype.createOrUpdatePostProcess = function (name) {
        var camera = this.editor.core.scene.activeCamera;
        for (var _i = 0, _a = camera._postProcesses; _i < _a.length; _i++) {
            var p_1 = _a[_i];
            if (p_1.name === name) {
                p_1.setConfig(JSON.parse(this.data.config));
                p_1.userConfig = {};
                this.editor.core.onSelectObject.notifyObservers(p_1);
                return p_1;
            }
        }
        // Update shader store
        babylonjs_1.Effect.ShadersStore[name + 'PixelShader'] = this.data.pixel;
        // Create post-process
        var config = JSON.parse(this.data.config);
        var p = new post_process_1.default(name, name, camera, config, null);
        p.setConfig(config);
        // Update graph tool
        this.editor.graph.clear();
        this.editor.graph.fill();
        this.editor.graph.select(p.name);
        this.editor.core.onSelectObject.notifyObservers(p);
        return p;
    };
    /**
    * On change the post-process name
    * @param id: the id of the post-process in the array
    * @param value: the new name
    */
    PostProcessCreator.prototype.changePostProcess = function (id, value) {
        var data = this.datas[id];
        var lastName = data.name;
        data.name = value;
        // Update post-process name
        var camera = this.editor.core.scene.activeCamera;
        for (var _i = 0, _a = camera._postProcesses; _i < _a.length; _i++) {
            var p = _a[_i];
            if (p.name === lastName) {
                p.name = value;
                return;
            }
        }
    };
    /**
     * Selects a post-process from the list
     * @param id: the id of the post-process in the array
     */
    PostProcessCreator.prototype.selectPostProcess = function (id) {
        this.data = this.datas[id];
        this.code.setValue(this.data.code);
        this.pixel.setValue(this.data.pixel);
        this.config.setValue(this.data.config);
    };
    /**
     * Creates the code editor
     */
    PostProcessCreator.prototype.createEditors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Create editors
                        this.code = new babylonjs_editor_1.CodeEditor('javascript', this.data.code);
                        return [4 /*yield*/, this.code.build('POST-PROCESS-CREATOR-EDITOR-CODE')];
                    case 1:
                        _a.sent();
                        this.pixel = new babylonjs_editor_1.CodeEditor('cpp', this.data.pixel);
                        return [4 /*yield*/, this.pixel.build('POST-PROCESS-CREATOR-EDITOR-PIXEL')];
                    case 2:
                        _a.sent();
                        this.config = new babylonjs_editor_1.CodeEditor('json', this.data.config);
                        return [4 /*yield*/, this.config.build('POST-PROCESS-CREATOR-EDITOR-CONFIG')];
                    case 3:
                        _a.sent();
                        // Events
                        this.layout.getPanelFromType('main').tabs.on('click', function (ev) {
                            $('#' + _this.currentTab).hide();
                            _this.currentTab = 'POST-PROCESS-CREATOR-EDITOR-' + ev.target.toUpperCase();
                            $('#' + _this.currentTab).show();
                        });
                        this.code.onChange = function (value) { return _this.data && (_this.data.code = value); };
                        this.pixel.onChange = function (value) {
                            if (!_this.data)
                                return;
                            _this.data.pixel = value;
                            babylonjs_1.Effect.ShadersStore[_this.data.name + 'PixelShader'] = _this.data.pixel;
                            _this.createOrUpdatePostProcess(_this.data.name);
                        };
                        this.config.onChange = function (value) {
                            if (!_this.data)
                                return;
                            _this.data.config = value;
                            try {
                                var config = JSON.parse(value);
                                var p = _this.createOrUpdatePostProcess(_this.data.name);
                            }
                            catch (e) { }
                        };
                        return [2 /*return*/];
                }
            });
        });
    };
    // Static members
    PostProcessCreator.DefaultCode = '';
    PostProcessCreator.DefaultPixel = '';
    PostProcessCreator.DefaultConfig = '';
    return PostProcessCreator;
}(babylonjs_editor_1.EditorPlugin));
exports.default = PostProcessCreator;
//# sourceMappingURL=index.js.map