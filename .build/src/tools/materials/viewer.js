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
var AnimationEditor = /** @class */ (function (_super) {
    __extends(AnimationEditor, _super);
    /**
     * Constructor
     * @param name: the name of the plugin
     */
    function AnimationEditor(editor) {
        var _this = _super.call(this, 'Materials Viewer') || this;
        _this.editor = editor;
        // Public members
        _this.images = [];
        _this.layout = null;
        _this.toolbar = null;
        _this.preview = null;
        // Protected members
        _this.canvas = null;
        _this.engines = [];
        _this.onResizePreview = function () { return _this.preview.engine.resize(); };
        _this.waitingMaterials = [];
        _this.onAddObject = function (material) { return _this.waitingMaterials.push(material); };
        return _this;
    }
    /**
     * Closes the plugin
     */
    AnimationEditor.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.engines.forEach(function (e) { return e.scenes.forEach(function (s) { return s.dispose(); }) && e.dispose(); });
                        this.editor.core.onResize.removeCallback(this.onResizePreview);
                        this.editor.core.onAddObject.removeCallback(this.onAddObject);
                        this.canvas.remove();
                        this.preview.scene.dispose();
                        this.preview.engine.dispose();
                        this.toolbar.element.destroy();
                        this.layout.element.destroy();
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
    AnimationEditor.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var panelSize, div;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        panelSize = this.editor.layout.getPanelSize('preview');
                        div = $(this.divElement);
                        // Create layout
                        this.layout = new babylonjs_editor_1.Layout('MaterialViewer');
                        this.layout.panels = [
                            { type: 'top', content: '<div id="MATERIAL-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
                            { type: 'left', content: '<div id="MATERIAL-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
                            { type: 'main', content: '<canvas id="MATERIAL-VIEWER-CANVAS" style="position: absolute; padding: 15px; width: 100%; height: 100%;"></canvas>', resizable: true }
                        ];
                        this.layout.build(div.attr('id'));
                        // Add toolbar
                        this.toolbar = new babylonjs_editor_1.Toolbar('MaterialViewerToolbar');
                        this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
                        this.toolbar.onClick = function (target) { return _this.toolbarClicked(target); };
                        this.toolbar.build('MATERIAL-VIEWER-TOOLBAR');
                        // Add preview
                        this.preview = this.createPreview($('#MATERIAL-VIEWER-CANVAS')[0]);
                        this.preview.engine.runRenderLoop(function () { return _this.preview.scene.render(); });
                        // Events
                        this.editor.core.onResize.add(this.onResizePreview);
                        this.editor.core.onAddObject.add(this.onAddObject);
                        // Add existing textures in list
                        return [4 /*yield*/, this.createList()];
                    case 1:
                        // Add existing textures in list
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * On the user shows the plugin
     */
    AnimationEditor.prototype.onShow = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, m;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.waitingMaterials;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        m = _a[_i];
                        return [4 /*yield*/, this.addMaterialPreview(m)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.waitingMaterials = [];
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * When the user clicks on the toolbar
     * @param target: the target button
     */
    AnimationEditor.prototype.toolbarClicked = function (target) {
        switch (target) {
            case 'add':
                this.createMaterialDialog();
                break;
            default: break;
        }
    };
    /**
     * Creates the list of materials (on the left)
     * @param div the tool's div element
     */
    AnimationEditor.prototype.createList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var div, scene, preview, _i, _a, mat;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        div = $('#MATERIAL-VIEWER-LIST');
                        // Add HTML nodes
                        this.canvas = babylonjs_editor_1.Tools.CreateElement('canvas', 'MaterialsViewerCanvas', {
                            width: '100px',
                            height: '100px',
                            visibility: 'hidden'
                        });
                        div.append(this.canvas);
                        scene = this.editor.core.scene;
                        preview = this.createPreview(this.canvas);
                        _i = 0, _a = scene.materials;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        mat = _a[_i];
                        return [4 /*yield*/, this.createPreviewNode(div, this.canvas, preview, mat)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Dispose temp preview
                        preview.scene.dispose();
                        preview.engine.dispose();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Adds a preview node
     * @param div
     * @param canvas
     * @param preview
     * @param material
     */
    AnimationEditor.prototype.createPreviewNode = function (div, canvas, preview, material) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var parent, text, img, base64, dropListener;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parent = babylonjs_editor_1.Tools.CreateElement('div', material.id + 'div', {
                            width: '100px',
                            height: '100px',
                            float: 'left',
                            margin: '10px'
                        });
                        text = babylonjs_editor_1.Tools.CreateElement('small', material.id + 'text', {
                            float: 'left',
                            position: 'relative'
                        });
                        text.innerText = material.name;
                        parent.appendChild(text);
                        img = babylonjs_editor_1.Tools.CreateElement('img', material.id, {
                            width: '100px',
                            height: '100px'
                        });
                        parent.appendChild(img);
                        return [4 /*yield*/, this.createMaterialPreview(canvas, preview, material)];
                    case 1:
                        base64 = _a.sent();
                        img.src = base64;
                        img.addEventListener('click', function (ev) {
                            var obj = material.serialize();
                            // Hack for CustomMaterialEdtitor class
                            obj._customCode = null;
                            _this.preview.sphere.material = babylonjs_1.Material.Parse(obj, _this.preview.scene, 'file:');
                            _this.preview.engine.resize();
                            _this.editor.core.onSelectObject.notifyObservers(material);
                        });
                        dropListener = this.dragEnd(material);
                        img.addEventListener('dragstart', function () {
                            _this.editor.core.engine.getRenderingCanvas().addEventListener('drop', dropListener);
                        });
                        img.addEventListener('dragend', function () {
                            _this.editor.core.engine.getRenderingCanvas().removeEventListener('drop', dropListener);
                        });
                        div.append(parent);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a scene to preview cube textures or just the preview panel
     * @param canvas: the HTML Canvas element
     * @param material: the material to add directly
     */
    AnimationEditor.prototype.createPreview = function (canvas, material) {
        var engine = new babylonjs_1.Engine(canvas);
        var scene = new babylonjs_1.Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);
        var camera = new babylonjs_1.ArcRotateCamera('MaterialViewerCamera', 1, 1, 15, babylonjs_1.Vector3.Zero(), scene);
        camera.attachControl(canvas);
        var sphere = babylonjs_1.Mesh.CreateSphere('MaterialViewerSphere', 32, 6, scene);
        var light = new babylonjs_1.PointLight('MaterialViewerLight', new babylonjs_1.Vector3(20, 20, 20), scene);
        if (material) {
            var obj = material.serialize();
            sphere.material = babylonjs_1.Material.Parse(obj, scene, 'file:');
        }
        return {
            engine: engine,
            scene: scene,
            camera: camera,
            sphere: sphere,
            material: material,
            light: light
        };
    };
    /**
     * Create a material preview
     * @param canvas: the HTML Canvas element
     * @param mat: the material to render
     */
    AnimationEditor.prototype.createMaterialPreview = function (canvas, preview, mat) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var obj = mat.serialize();
                        preview.sphere.material = babylonjs_1.Material.Parse(obj, preview.scene, 'file:');
                        preview.engine.runRenderLoop(function () {
                            preview.scene.render();
                            if (preview.scene.getWaitingItemsCount() === 0) {
                                preview.scene.render();
                                var base64 = canvas.toDataURL('image/png');
                                preview.engine.stopRenderLoop();
                                resolve(base64);
                            }
                        });
                    })];
            });
        });
    };
    /**
     * Returns an event called when the user drops a material on the canvas
     * @param material: the material to drop on a mesh/instanced-mesh
     */
    AnimationEditor.prototype.dragEnd = function (material) {
        var _this = this;
        return function (ev) {
            var scene = _this.editor.core.scene;
            var pick = scene.pick(ev.offsetX, ev.offsetY);
            if (!pick.pickedMesh)
                return;
            if (pick.pickedMesh instanceof babylonjs_1.InstancedMesh)
                pick.pickedMesh.sourceMesh.material = material;
            else if (pick.pickedMesh instanceof babylonjs_1.Mesh)
                pick.pickedMesh.material = material;
            _this.editor.core.onSelectObject.notifyObservers(pick.pickedMesh);
        };
    };
    /**
     * Creates a material selector dialog
     */
    AnimationEditor.prototype.createMaterialDialog = function () {
        var _this = this;
        var materials = [
            'StandardMaterial',
            'PBRMaterial',
            'FireMaterial',
            'CellMaterial',
            'GridMaterial',
            'TriPlanarMaterial',
            'TerrainMaterial',
            'LavaMaterial'
        ];
        var picker = new babylonjs_editor_1.Picker('Select Material...');
        picker.addItems(materials.map(function (m) { return { name: m }; }));
        picker.open(function (items) { return __awaiter(_this, void 0, void 0, function () {
            var ctor, material;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ctor = babylonjs_1.Tools.Instantiate('BABYLON.' + items[0].name);
                        material = new ctor(items[0].name + babylonjs_1.Tools.RandomId(), this.editor.core.scene);
                        // Add preview node
                        return [4 /*yield*/, this.addMaterialPreview(material)];
                    case 1:
                        // Add preview node
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    /**
     * Adds a new material preview
     * @param material: the material to preview
     */
    AnimationEditor.prototype.addMaterialPreview = function (material) {
        return __awaiter(this, void 0, void 0, function () {
            var preview;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        preview = this.createPreview(this.canvas);
                        return [4 /*yield*/, this.createPreviewNode($('#MATERIAL-VIEWER-LIST'), this.canvas, preview, material)];
                    case 1:
                        _a.sent();
                        preview.scene.dispose();
                        preview.engine.dispose();
                        return [2 /*return*/];
                }
            });
        });
    };
    return AnimationEditor;
}(babylonjs_editor_1.EditorPlugin));
exports.default = AnimationEditor;
//# sourceMappingURL=viewer.js.map