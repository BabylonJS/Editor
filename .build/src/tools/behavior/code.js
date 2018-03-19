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
require("../../extensions/behavior/code");
var BehaviorCodeEditor = /** @class */ (function (_super) {
    __extends(BehaviorCodeEditor, _super);
    /**
     * Constructor
     * @param name: the name of the plugin
     */
    function BehaviorCodeEditor(editor) {
        var _this = _super.call(this, 'Code') || this;
        _this.editor = editor;
        // Public members
        _this.layout = null;
        _this.toolbar = null;
        _this.grid = null;
        // Protected members
        _this.code = null;
        _this.template = '// Some code';
        _this.node = null;
        _this.datas = null;
        _this.data = null;
        _this.onSelectObject = function (node) { return node && _this.selectObject(node); };
        return _this;
    }
    /**
     * Closes the plugin
     */
    BehaviorCodeEditor.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.toolbar.element.destroy();
                        this.grid.element.destroy();
                        this.layout.element.destroy();
                        this.code.editor.dispose();
                        // Events
                        this.editor.core.onSelectObject.removeCallback(this.onSelectObject);
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
    BehaviorCodeEditor.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var div, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        div = $(this.divElement);
                        // Create layout
                        this.layout = new babylonjs_editor_1.Layout('Code');
                        this.layout.panels = [
                            { type: 'top', content: '<div id="CODE-BEHAVIOR-TOOLBAR"></div>', size: 30, resizable: false },
                            { type: 'left', content: '<div id="CODE-BEHAVIOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
                            { type: 'main', content: '<div id="CODE-BEHAVIOR-EDITOR" style="width: 100%; height: 100%;"></div>', resizable: true }
                        ];
                        this.layout.build(div.attr('id'));
                        // Add toolbar
                        this.toolbar = new babylonjs_editor_1.Toolbar('CodeToolbar');
                        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
                        this.toolbar.build('CODE-BEHAVIOR-TOOLBAR');
                        // Add grid
                        this.grid = new babylonjs_editor_1.Grid('CodeGrid', {
                            toolbarReload: false,
                            toolbarSearch: false,
                            toolbarEdit: false
                        });
                        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%', editable: { type: 'string' } }];
                        this.grid.onClick = function (id) { return _this.selectCode(id[0]); };
                        this.grid.onAdd = function () { return _this.add(); };
                        this.grid.onDelete = function (ids) { return _this.delete(ids); };
                        this.grid.onChange = function (id, value) { return _this.change(id, value); };
                        this.grid.build('CODE-BEHAVIOR-LIST');
                        // Add code editor
                        return [4 /*yield*/, this.createEditor()];
                    case 1:
                        // Add code editor
                        _b.sent();
                        _a = this;
                        return [4 /*yield*/, babylonjs_editor_1.Tools.LoadFile('./assets/templates/code.txt', false)];
                    case 2:
                        _a.template = _b.sent();
                        // Events
                        this.editor.core.onSelectObject.add(this.onSelectObject);
                        // Select object
                        if (this.editor.core.currentSelectedObject)
                            this.selectObject(this.editor.core.currentSelectedObject);
                        // Request extension
                        extensions_1.default.RequestExtension(this.editor.core.scene, 'BehaviorExtension');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * On the user shows the plugin
     */
    BehaviorCodeEditor.prototype.onShow = function () {
        this.grid.element.resize();
    };
    /**
     * On the user selects a node in the editor
     * @param node the selected node
     */
    BehaviorCodeEditor.prototype.selectObject = function (node) {
        var _this = this;
        this.node = node;
        node.metadata = node.metadata || {};
        // Add all codes
        this.datas = node.metadata['behavior'];
        if (!this.datas)
            this.datas = node.metadata['behavior'] = { node: (node instanceof babylonjs_1.Scene) ? 'Scene' : node.name, metadatas: [] };
        // Clear existing data
        this.data = null;
        this.grid.element.clear();
        this.code.setValue('');
        // Add rows
        this.datas.metadatas.forEach(function (d, index) {
            _this.grid.addRecord({
                recid: index,
                name: d.name
            });
        });
        this.grid.element.refresh();
        // Select first behavior
        if (this.datas.metadatas.length > 0) {
            this.selectCode(0);
            this.grid.select([0]);
        }
    };
    /**
     * On the user selects a code
     * @param index the index of the
     */
    BehaviorCodeEditor.prototype.selectCode = function (index) {
        this.data = this.datas.metadatas[index];
        this.code.setValue(this.data.code);
    };
    /**
     * The user clicks on "Add"
     */
    BehaviorCodeEditor.prototype.add = function () {
        var ctor = babylonjs_editor_1.Tools.GetConstructorName(this.node).toLowerCase();
        if (this.node instanceof babylonjs_1.DirectionalLight)
            ctor = "dirlight";
        else if (this.node instanceof babylonjs_1.HemisphericLight)
            ctor = "hemlight";
        var data = {
            name: 'New Script',
            active: true,
            code: this.template.replace(/{{type}}/g, ctor)
        };
        this.datas.metadatas.push(data);
        this.grid.addRow({
            recid: this.datas.metadatas.length - 1,
            name: data.name
        });
    };
    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    BehaviorCodeEditor.prototype.delete = function (ids) {
        var _this = this;
        var offset = 0;
        ids.forEach(function (id) {
            _this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });
    };
    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    BehaviorCodeEditor.prototype.change = function (id, value) {
        this.datas.metadatas[id].name = value;
    };
    /**
     * Creates the code editor
     */
    BehaviorCodeEditor.prototype.createEditor = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.code = new babylonjs_editor_1.CodeEditor('javascript');
                        return [4 /*yield*/, this.code.build('CODE-BEHAVIOR-EDITOR')];
                    case 1:
                        _a.sent();
                        this.code.onChange = function (value) {
                            if (_this.data)
                                _this.data.code = _this.code.getValue();
                        };
                        return [2 /*return*/];
                }
            });
        });
    };
    return BehaviorCodeEditor;
}(babylonjs_editor_1.EditorPlugin));
exports.default = BehaviorCodeEditor;
//# sourceMappingURL=code.js.map