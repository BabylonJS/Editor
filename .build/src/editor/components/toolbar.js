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
var toolbar_1 = require("../gui/toolbar");
var window_1 = require("../gui/window");
var dialog_1 = require("../gui/dialog");
var tools_1 = require("../tools/tools");
var undo_redo_1 = require("../tools/undo-redo");
var scene_exporter_1 = require("../scene/scene-exporter");
var scene_factory_1 = require("../scene/scene-factory");
var scene_importer_1 = require("../scene/scene-importer");
var scene_manager_1 = require("../scene/scene-manager");
var scene_serializer_1 = require("../scene/scene-serializer");
var EditorToolbar = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor's reference
     */
    function EditorToolbar(editor) {
        var _this = this;
        this.editor = editor;
        // Build main toolbar
        this.main = new toolbar_1.default('MainToolBar');
        this.main.items = [
            {
                type: 'menu', id: 'project', text: 'Project', img: 'icon-folder', items: [
                    { id: 'import-project', img: 'icon-export', text: 'Import Project...' },
                    { id: 'reload-project', img: 'icon-copy', text: 'Reload...' },
                    { id: 'download-project', img: 'icon-export', text: 'Download Project...' },
                    { type: 'break' },
                    { id: 'clean-project', img: 'icon-copy', text: 'Clean Project...' },
                    { type: 'break' },
                    { id: 'export-project', img: 'icon-files', text: 'Export Project...' },
                    { id: 'export-template', img: 'icon-files-project', text: 'Export Template...' },
                    { type: 'break' },
                    { id: 'serialize-scene', img: 'icon-copy', text: 'Export Scene As...' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'edit', text: 'Edit', img: 'icon-edit', items: [
                    { id: 'undo', img: 'icon-undo', text: 'Undo' },
                    { id: 'redo', img: 'icon-redo', text: 'Redo' },
                    { type: 'break' },
                    { id: 'clean-materials', img: 'icon-recycle', text: 'Clean Unused Materials' },
                    { id: 'clean-textures', img: 'icon-recycle', text: 'Clean Unused Textures' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'view', text: 'View', img: 'icon-helpers', items: [
                    { id: 'animations', img: 'icon-animated-mesh', text: 'Animations...' },
                    { type: 'break' },
                    { id: 'textures', img: 'icon-copy', text: 'Textures...' },
                    { id: 'materials', img: 'icon-effects', text: 'Materials...' },
                    { type: 'break ' },
                    { id: 'code', img: 'icon-behavior-editor', text: 'Code...' },
                    { id: 'material-creator', img: 'icon-shaders', text: 'Material Creator' },
                    { id: 'post-process-creator', img: 'icon-shaders', text: 'Post-Process Creator' }
                ]
            },
            { type: 'break' },
            {
                type: 'menu', id: 'add', text: 'Add', img: 'icon-add', items: [
                    { id: 'particle-system', img: 'icon-particles', text: 'Particle System' },
                    { id: 'particle-system-animated', img: 'icon-particles', text: 'Animated Particle System' },
                    { type: 'break;' },
                    { id: 'sky', img: 'icon-shaders', text: 'Sky Effect' },
                    { id: 'water', img: 'icon-water', text: 'Water Effect' },
                    { type: 'break' },
                    { id: 'ground', img: 'icon-mesh', text: 'Ground Mesh' }
                ]
            }
        ];
        this.main.onClick = function (target) { return _this.onMainClick(target); };
        this.main.build('MAIN-TOOLBAR');
        // Build toolbar
        this.tools = new toolbar_1.default('ToolsToolBar');
        this.tools.items = [
            { type: 'check', id: 'play', text: 'Play', img: 'icon-play-game' },
            { type: 'button', id: 'test', text: 'Test...', img: 'icon-play-game-windowed' }
        ];
        this.tools.onClick = function (target) { return _this.onToolsClick(target); };
        this.tools.build('TOOLS-TOOLBAR');
    }
    /**
     * Once the user clicks on a menu of the main toolbar
     * @param target the target element
     */
    EditorToolbar.prototype.onMainClick = function (target) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = target;
                        switch (_a) {
                            case 'project:import-project': return [3 /*break*/, 1];
                            case 'project:reload-project': return [3 /*break*/, 2];
                            case 'project:download-project': return [3 /*break*/, 3];
                            case 'project:clean-project': return [3 /*break*/, 4];
                            case 'project:export-project': return [3 /*break*/, 6];
                            case 'project:export-template': return [3 /*break*/, 8];
                            case 'project:serialize-scene': return [3 /*break*/, 10];
                            case 'edit:undo': return [3 /*break*/, 11];
                            case 'edit:redo': return [3 /*break*/, 12];
                            case 'edit:clean-materials': return [3 /*break*/, 13];
                            case 'edit:clean-textures': return [3 /*break*/, 14];
                            case 'view:animations': return [3 /*break*/, 15];
                            case 'view:textures': return [3 /*break*/, 17];
                            case 'view:materials': return [3 /*break*/, 19];
                            case 'view:code': return [3 /*break*/, 21];
                            case 'view:material-creator': return [3 /*break*/, 23];
                            case 'view:post-process-creator': return [3 /*break*/, 25];
                            case 'add:particle-system': return [3 /*break*/, 27];
                            case 'add:particle-system-animated': return [3 /*break*/, 28];
                            case 'add:sky': return [3 /*break*/, 29];
                            case 'add:water': return [3 /*break*/, 30];
                            case 'add:ground': return [3 /*break*/, 31];
                        }
                        return [3 /*break*/, 32];
                    case 1:
                        scene_importer_1.default.ImportProject(this.editor);
                        return [3 /*break*/, 33];
                    case 2:
                        dialog_1.default.Create('Reload scene', 'Are you sure to reload the entire scene?', function (result) {
                            if (result === 'No')
                                return;
                            _this.editor._showReloadDialog = false;
                            _this.editor.filesInput['_processReload']();
                        });
                        return [3 /*break*/, 33];
                    case 3:
                        scene_exporter_1.default.DownloadBabylonFile(this.editor);
                        return [3 /*break*/, 33];
                    case 4: return [4 /*yield*/, this.editor.createDefaultScene(true)];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 6: return [4 /*yield*/, scene_exporter_1.default.ExportProject(this.editor)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 8: return [4 /*yield*/, scene_exporter_1.default.ExportTemplate(this.editor)];
                    case 9:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 10:
                        new scene_serializer_1.default(this.editor.core.scene);
                        return [3 /*break*/, 33];
                    case 11:
                        undo_redo_1.default.Undo();
                        return [3 /*break*/, 33];
                    case 12:
                        undo_redo_1.default.Redo();
                        return [3 /*break*/, 33];
                    case 13:
                        window_1.default.CreateAlert("Cleared " + scene_manager_1.default.CleanUnusedMaterials(this.editor.core.scene) + " materials", 'Report');
                        return [3 /*break*/, 33];
                    case 14:
                        window_1.default.CreateAlert("Cleared " + scene_manager_1.default.CleanUnusedTextures(this.editor.core.scene) + " textures", 'Report');
                        return [3 /*break*/, 33];
                    case 15: return [4 /*yield*/, this.loadTool('animation-editor', 'Animations Editor')];
                    case 16:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 17: return [4 /*yield*/, this.loadTool('texture-viewer', 'Textures Viewer')];
                    case 18:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 19: return [4 /*yield*/, this.loadTool('material-viewer', 'Materials Viewer')];
                    case 20:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 21: return [4 /*yield*/, this.loadTool('behavior-editor', 'Behavior Code')];
                    case 22:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 23: return [4 /*yield*/, this.loadTool('material-creator', 'Material Creator')];
                    case 24:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 25: return [4 /*yield*/, this.loadTool('post-process-creator', 'Post-Process Creator')];
                    case 26:
                        _b.sent();
                        return [3 /*break*/, 33];
                    case 27:
                        scene_factory_1.default.CreateDefaultParticleSystem(this.editor, false);
                        return [3 /*break*/, 33];
                    case 28:
                        scene_factory_1.default.CreateDefaultParticleSystem(this.editor, true);
                        return [3 /*break*/, 33];
                    case 29:
                        scene_factory_1.default.CreateSkyEffect(this.editor);
                        return [3 /*break*/, 33];
                    case 30:
                        scene_factory_1.default.CreateWaterEffect(this.editor);
                        return [3 /*break*/, 33];
                    case 31:
                        scene_factory_1.default.CreateGroundMesh(this.editor);
                        return [3 /*break*/, 33];
                    case 32: return [3 /*break*/, 33];
                    case 33: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Once the user clicks on a menu of the tools toolbar
     * @param target the target element
     */
    EditorToolbar.prototype.onToolsClick = function (target) {
        switch (target) {
            case 'play':
                var animatables = scene_manager_1.default.GetAnimatables(this.editor.core.scene);
                this.tools.isChecked('play', true) ? scene_manager_1.default.PlayAllAnimatables(this.editor.core.scene, animatables) : this.editor.core.scene.stopAllAnimations();
                break;
            case 'test':
                scene_exporter_1.default.CreateFiles(this.editor);
                tools_1.default.OpenPopup('./preview.html', 'Preview', 1280, 800);
                break;
            default: break;
        }
    };
    /**
     * Loads an editor tool and add it in the edit-panel
     * @param url the URL of the tool
     * @param name: the name of the tool to draw when locking the panel
     */
    EditorToolbar.prototype.loadTool = function (url, name) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.editor.addEditPanelPlugin(url, false, name)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return EditorToolbar;
}());
exports.default = EditorToolbar;
//# sourceMappingURL=toolbar.js.map