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
require("../../extensions/material-creator/material-creator");
var MaterialCreator = /** @class */ (function (_super) {
    __extends(MaterialCreator, _super);
    /**
     * Constructor
     * @param name: the name of the plugin
     */
    function MaterialCreator(editor) {
        var _this = _super.call(this, 'Material Creator') || this;
        _this.editor = editor;
        // Public members
        _this.layout = null;
        _this.grid = null;
        // Protected members
        _this.currentTab = 'MATERIAL-CREATOR-EDITOR-CODE';
        _this.code = null;
        _this.vertex = null;
        _this.pixel = null;
        _this.config = null;
        _this.datas = [];
        _this.data = null;
        _this.extension = null;
        return _this;
    }
    /**
     * Closes the plugin
     */
    MaterialCreator.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.layout.element.destroy();
                        this.grid.element.destroy();
                        this.code.editor.dispose();
                        this.vertex.editor.dispose();
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
    MaterialCreator.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g, _h, material;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        // Template
                        _a = !MaterialCreator.DefaultCode;
                        if (!_a) 
                        // Template
                        return [3 /*break*/, 2];
                        _b = MaterialCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/material-creator/class.js')];
                    case 1:
                        _a = (_b.DefaultCode = _j.sent());
                        _j.label = 2;
                    case 2:
                        // Template
                        _a;
                        _c = !MaterialCreator.DefaultVertex;
                        if (!_c) return [3 /*break*/, 4];
                        _d = MaterialCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/material-creator/vertex.fx')];
                    case 3:
                        _c = (_d.DefaultVertex = _j.sent());
                        _j.label = 4;
                    case 4:
                        _c;
                        _e = !MaterialCreator.DefaultPixel;
                        if (!_e) return [3 /*break*/, 6];
                        _f = MaterialCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/material-creator/pixel.fx')];
                    case 5:
                        _e = (_f.DefaultPixel = _j.sent());
                        _j.label = 6;
                    case 6:
                        _e;
                        _g = !MaterialCreator.DefaultConfig;
                        if (!_g) return [3 /*break*/, 8];
                        _h = MaterialCreator;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/material-creator/config.json')];
                    case 7:
                        _g = (_h.DefaultConfig = _j.sent());
                        _j.label = 8;
                    case 8:
                        _g;
                        // Request extension
                        this.extension = extensions_1.default.RequestExtension(this.editor.core.scene, 'MaterialCreatorExtension');
                        // Metadatas
                        this.editor.core.scene.metadata = this.editor.core.scene.metadata || {};
                        if (!this.editor.core.scene.metadata['MaterialCreator']) {
                            this.datas = this.editor.core.scene.metadata['MaterialCreator'] = [{
                                    name: 'Custom material',
                                    code: MaterialCreator.DefaultCode,
                                    vertex: MaterialCreator.DefaultVertex,
                                    pixel: MaterialCreator.DefaultPixel,
                                    config: MaterialCreator.DefaultConfig,
                                    userConfig: {}
                                }];
                            this.data = this.datas[0];
                            material = this.extension.createMaterial({
                                name: this.data.name,
                                code: null,
                                vertex: this.data.vertex,
                                pixel: this.data.pixel,
                                config: this.data.config,
                                userConfig: {}
                            });
                            this.editor.core.onAddObject.notifyObservers(material);
                        }
                        this.datas = this.editor.core.scene.metadata['MaterialCreator'];
                        this.data = this.datas[0];
                        // Create layout
                        this.layout = new babylonjs_editor_1.Layout('MaterialCreatorCode');
                        this.layout.panels = [
                            { type: 'left', content: '<div id="MATERIAL-CREATOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
                            {
                                type: 'main',
                                content: "\n                    <div id=\"MATERIAL-CREATOR-EDITOR-CODE\" style=\"width: 100%; height: 100%;\"></div>\n                    <div id=\"MATERIAL-CREATOR-EDITOR-VERTEX\" style=\"width: 100%; height: 100%; display: none;\"></div>\n                    <div id=\"MATERIAL-CREATOR-EDITOR-PIXEL\" style=\"width: 100%; height: 100%; display: none;\"></div>\n                    <div id=\"MATERIAL-CREATOR-EDITOR-CONFIG\" style=\"width: 100%; height: 100%; display: none;\"></div>\n                ",
                                resizable: true,
                                tabs: [
                                    { id: 'code', caption: 'Code' },
                                    { id: 'vertex', caption: 'Vertex' },
                                    { id: 'pixel', caption: 'Pixel' },
                                    { id: 'config', caption: 'Config' }
                                ]
                            }
                        ];
                        this.layout.build(this.divElement.id);
                        // Create grid
                        this.grid = new babylonjs_editor_1.Grid('MaterialCreatorGrid', {
                            toolbarReload: false,
                            toolbarEdit: false,
                            toolbarSearch: false
                        });
                        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
                        this.grid.build('MATERIAL-CREATOR-LIST');
                        this.grid.onAdd = function () { return _this.addMaterial(); };
                        this.grid.onClick = function (selected) { return _this.selectMaterial(selected[0]); };
                        this.grid.onDelete = function (selected) { return _this.removeMaterial(selected[0]); };
                        this.grid.onChange = function (id, value) { return _this.changeMaterial(id, value); };
                        this.datas.forEach(function (d, index) { return _this.grid.addRecord({
                            name: d.name,
                            recid: index
                        }); });
                        this.grid.element.refresh();
                        this.grid.select([0]);
                        // Add code editors
                        return [4 /*yield*/, this.createEditors()];
                    case 9:
                        // Add code editors
                        _j.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * On the user shows the plugin
     */
    MaterialCreator.prototype.onShow = function () {
        this.grid.element.resize();
    };
    /**
     * Creates a new material
     */
    MaterialCreator.prototype.addMaterial = function () {
        // Create data and material
        var data = {
            name: 'Custom material' + this.datas.length + 1,
            code: MaterialCreator.DefaultCode,
            vertex: MaterialCreator.DefaultVertex,
            pixel: MaterialCreator.DefaultPixel,
            config: MaterialCreator.DefaultConfig,
            userConfig: {}
        };
        var material = this.extension.createMaterial({
            name: data.name,
            code: null,
            vertex: data.vertex,
            pixel: data.pixel,
            config: data.config,
            userConfig: data.userConfig
        });
        // Collect and add to the list
        this.datas.push(data);
        this.grid.addRow({
            name: material.name,
            recid: this.grid.element.records.length - 1
        });
        // Notify
        this.editor.core.onAddObject.notifyObservers(material);
    };
    /**
     * On change the material name
     * @param id: the id of the material in the array
     * @param value: the new name
     */
    MaterialCreator.prototype.changeMaterial = function (id, value) {
        var data = this.datas[id];
        var material = this.editor.core.scene.getMaterialByName(data.name);
        if (material)
            material.name = value;
        data.name = value;
    };
    /**
     * Selects a material from the list
     * @param id: the id of the material in the array
     */
    MaterialCreator.prototype.selectMaterial = function (id) {
        this.data = this.datas[id];
        this.code.setValue(this.data.code);
        this.vertex.setValue(this.data.vertex);
        this.pixel.setValue(this.data.pixel);
        this.config.setValue(this.data.config);
    };
    /**
     * Removes a material from the list and scene
     * @param id: the id of the material in the array
     */
    MaterialCreator.prototype.removeMaterial = function (id) {
        var material = this.editor.core.scene.getMaterialByName(this.datas[id].name);
        if (material)
            material.dispose(true);
        this.datas.splice(id, 1);
    };
    /**
     * Updaes the current material's shaders (vertex & pixel)
     */
    MaterialCreator.prototype.updateShaders = function () {
        // Update material shader
        var material = this.editor.core.scene.getMaterialByName(this.data.name);
        if (!material)
            return;
        babylonjs_1.Effect.ShadersStore[material._shaderName + 'VertexShader'] = this.data.vertex;
        babylonjs_1.Effect.ShadersStore[material._shaderName + 'PixelShader'] = this.data.pixel;
        material._buildId++;
        material.markAsDirty(babylonjs_1.Material.MiscDirtyFlag);
    };
    /**
     * Creates the code editor
     */
    MaterialCreator.prototype.createEditors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Create editors
                        this.code = new babylonjs_editor_1.CodeEditor('javascript', this.data.code);
                        return [4 /*yield*/, this.code.build('MATERIAL-CREATOR-EDITOR-CODE')];
                    case 1:
                        _a.sent();
                        this.vertex = new babylonjs_editor_1.CodeEditor('cpp', this.data.vertex);
                        return [4 /*yield*/, this.vertex.build('MATERIAL-CREATOR-EDITOR-VERTEX')];
                    case 2:
                        _a.sent();
                        this.pixel = new babylonjs_editor_1.CodeEditor('cpp', this.data.pixel);
                        return [4 /*yield*/, this.pixel.build('MATERIAL-CREATOR-EDITOR-PIXEL')];
                    case 3:
                        _a.sent();
                        this.config = new babylonjs_editor_1.CodeEditor('json', this.data.config);
                        return [4 /*yield*/, this.config.build('MATERIAL-CREATOR-EDITOR-CONFIG')];
                    case 4:
                        _a.sent();
                        // Events
                        this.layout.getPanelFromType('main').tabs.on('click', function (ev) {
                            $('#' + _this.currentTab).hide();
                            _this.currentTab = 'MATERIAL-CREATOR-EDITOR-' + ev.target.toUpperCase();
                            $('#' + _this.currentTab).show();
                        });
                        this.code.onChange = function (value) { return _this.data && (_this.data.code = value); };
                        this.vertex.onChange = function (value) {
                            if (!_this.data)
                                return;
                            _this.data.vertex = value;
                            _this.updateShaders();
                        };
                        this.pixel.onChange = function (value) {
                            if (!_this.data)
                                return;
                            _this.data.pixel = value;
                            _this.updateShaders();
                        };
                        this.config.onChange = function (value) {
                            if (!_this.data)
                                return;
                            _this.data.config = value;
                            var material = _this.editor.core.scene.getMaterialByName(_this.data.name);
                            if (material) {
                                try {
                                    var config = JSON.parse(_this.data.config);
                                    material.config = config;
                                    // Update shaders and edition tool
                                    _this.editor.core.onSelectObject.notifyObservers(material);
                                    _this.updateShaders();
                                }
                                catch (e) { }
                            }
                        };
                        return [2 /*return*/];
                }
            });
        });
    };
    // Static members
    MaterialCreator.DefaultCode = '';
    MaterialCreator.DefaultVertex = '';
    MaterialCreator.DefaultPixel = '';
    MaterialCreator.DefaultConfig = '';
    return MaterialCreator;
}(babylonjs_editor_1.EditorPlugin));
exports.default = MaterialCreator;
//# sourceMappingURL=index.js.map