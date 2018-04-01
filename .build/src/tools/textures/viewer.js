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
    function AnimationEditor(editor, object, property, allowCubes) {
        var _this = _super.call(this, 'Texture Viewer') || this;
        _this.editor = editor;
        // Public members
        _this.images = [];
        _this.layout = null;
        _this.toolbar = null;
        _this.engine = null;
        _this.scene = null;
        _this.texture = null;
        _this.sphere = null;
        _this.material = null;
        _this.camera = null;
        _this.postProcess = null;
        // Protected members
        _this.engines = [];
        _this.onResizePreview = function () { return _this.engine.resize(); };
        _this.object = object;
        _this.property = property;
        _this.allowCubes = allowCubes;
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
                        this.engines.forEach(function (e) {
                            e.scenes.forEach(function (s) { return s.dispose(); });
                            e.dispose();
                        });
                        this.editor.core.onResize.removeCallback(this.onResizePreview);
                        this.postProcess.dispose(this.camera);
                        this.scene.dispose();
                        this.engine.dispose();
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
            var panelSize, div, preview;
            return __generator(this, function (_a) {
                panelSize = this.editor.layout.getPanelSize('preview');
                div = $(this.divElement);
                // Create layout
                this.layout = new babylonjs_editor_1.Layout('TextureViewer');
                this.layout.panels = [
                    { type: 'top', content: '<div id="TEXTURE-VIEWER-TOOLBAR"></div>', size: 30, resizable: false },
                    { type: 'left', content: '<div id="TEXTURE-VIEWER-LIST"></div>', size: panelSize.width / 2, overflow: 'auto', resizable: true },
                    { type: 'main', content: '<canvas id="TEXTURE-VIEWER-CANVAS" style="display: block;position: initial; padding: 15px; width: 100%; height: 100%;"></canvas>', resizable: true }
                ];
                this.layout.build(div.attr('id'));
                // Add toolbar
                this.toolbar = new babylonjs_editor_1.Toolbar('TextureViewerToolbar');
                this.toolbar.items = [{ id: 'add', text: 'Add...', caption: 'Add...', img: 'icon-add' }];
                this.toolbar.onClick = function (target) { return _this.toolbarClicked(target); };
                this.toolbar.build('TEXTURE-VIEWER-TOOLBAR');
                preview = this.createPreview($('#TEXTURE-VIEWER-CANVAS')[0]);
                this.engine = preview.engine;
                this.scene = preview.scene;
                this.camera = preview.camera;
                this.sphere = preview.sphere;
                this.material = preview.material;
                this.postProcess = new babylonjs_1.PassPostProcess('TextureViewerPostProcess', 1.0, this.camera);
                this.postProcess.onApply = function (e) { return _this.texture && e.setTexture('textureSampler', _this.texture); };
                this.engine.runRenderLoop(function () { return _this.scene.render(); });
                // Add existing textures in list
                this.createList();
                // Events
                this.editor.core.onResize.add(this.onResizePreview);
                return [2 /*return*/];
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
                this.createFileDialog();
                break;
            default: break;
        }
    };
    /**
     * Creates the list of textures (on the left)
     * @param div the tool's div element
     */
    AnimationEditor.prototype.createList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var div, _i, _a, tex, url, file;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.engines.forEach(function (e) { return e.scenes.forEach(function (s) { return s.dispose(); }) && e.dispose(); });
                        div = $('#TEXTURE-VIEWER-LIST');
                        while (div[0].children.length > 0)
                            div[0].children[0].remove();
                        _i = 0, _a = this.editor.core.scene.textures;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        tex = _a[_i];
                        if (this.allowCubes !== undefined && tex.isCube && !this.allowCubes)
                            return [3 /*break*/, 3];
                        url = tex['url'];
                        if (!url)
                            return [3 /*break*/, 3];
                        if (url.indexOf('file:') === 0)
                            url = url.replace('file:', '').toLowerCase();
                        file = babylonjs_1.FilesInput.FilesToLoad[url];
                        if (!file) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.addPreviewNode(file, tex)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Adds a preview node to the textures list
     * @param texturesList: the textures list node
     * @param file: the file to add
     * @param extension: the extension of the file
     */
    AnimationEditor.prototype.addPreviewNode = function (file, originalTexture) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var availableExtensions, ext, texturesList, canvas, preview_1, data, img, texture;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        availableExtensions = ['jpg', 'png', 'jpeg', 'bmp', 'dds'];
                        ext = babylonjs_editor_1.Tools.GetFileExtension(file.name);
                        texturesList = $('#TEXTURE-VIEWER-LIST');
                        if (availableExtensions.indexOf(ext) === -1)
                            return [2 /*return*/];
                        if (!(ext === 'dds')) return [3 /*break*/, 1];
                        canvas = babylonjs_editor_1.Tools.CreateElement('canvas', file.name, {
                            width: '100px',
                            height: '100px',
                            float: 'left',
                            margin: '10px'
                        });
                        canvas.addEventListener('click', function (ev) { return _this.setTexture(file.name, ext, originalTexture); });
                        texturesList.append(canvas);
                        preview_1 = this.createPreview(canvas, file);
                        preview_1.engine.runRenderLoop(function () { return preview_1.scene.render(); });
                        this.engines.push(preview_1.engine);
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, babylonjs_editor_1.Tools.ReadFileAsBase64(file)];
                    case 2:
                        data = _a.sent();
                        img = babylonjs_editor_1.Tools.CreateElement('img', file.name, {
                            width: '100px',
                            height: '100px',
                            float: 'left',
                            margin: '10px'
                        });
                        img.src = data;
                        img.addEventListener('click', function (ev) { return _this.setTexture(file.name, ext, originalTexture); });
                        texturesList.append(img);
                        // Create texture in editor scene
                        if (!this.editor.core.scene.textures.find(function (t) { return t.name === file.name; })) {
                            texture = new babylonjs_1.Texture('file:' + file.name, this.editor.core.scene);
                            texture.name = texture.url = texture.name.replace('file:', '');
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sets the texture in preview canvas
     * @param name: the name of the texture
     */
    AnimationEditor.prototype.setTexture = function (name, extension, originalTexture) {
        this.camera.detachPostProcess(this.postProcess);
        this.sphere.setEnabled(false);
        switch (extension) {
            case 'dds':
                this.texture = this.material.reflectionTexture = babylonjs_1.CubeTexture.CreateFromPrefilteredData('file:' + name, this.scene);
                this.sphere.setEnabled(true);
                break;
            default:
                this.camera.attachPostProcess(this.postProcess);
                this.texture = new babylonjs_1.Texture('file:' + name, this.scene);
                break;
        }
        this.engine.resize();
        if (this.object && this.property) {
            this.object[this.property] = originalTexture;
        }
        else {
            // Send object selected
            this.editor.core.onSelectObject.notifyObservers(originalTexture);
        }
    };
    /**
     * Creates a scene to preview cube textures or just the preview panel
     * @param canvas: the HTML Canvas element
     * @param file: the Cube Texture file to add directly
     */
    AnimationEditor.prototype.createPreview = function (canvas, file) {
        var engine = new babylonjs_1.Engine(canvas);
        var scene = new babylonjs_1.Scene(engine);
        scene.clearColor.set(0, 0, 0, 1);
        var camera = new babylonjs_1.ArcRotateCamera('TextureCubeCamera', 1, 1, 15, babylonjs_1.Vector3.Zero(), scene);
        camera.attachControl(canvas);
        var sphere = babylonjs_1.Mesh.CreateSphere('TextureCubeSphere', 32, 6, scene);
        var material = new babylonjs_1.PBRMaterial('TextureCubeMaterial', scene);
        if (file)
            material.reflectionTexture = babylonjs_1.CubeTexture.CreateFromPrefilteredData('file:' + file.name, scene);
        sphere.material = material;
        return {
            engine: engine,
            scene: scene,
            camera: camera,
            sphere: sphere,
            material: material
        };
    };
    /**
     * Creates a file selector dialog
     */
    AnimationEditor.prototype.createFileDialog = function () {
        var _this = this;
        babylonjs_editor_1.Tools.OpenFileDialog(function (files) { return __awaiter(_this, void 0, void 0, function () {
            var _i, files_1, f, ext, texture;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.layout.lockPanel('top', 'Loading...', true);
                        _i = 0, files_1 = files;
                        _a.label = 1;
                    case 1:
                        if (!(_i < files_1.length)) return [3 /*break*/, 4];
                        f = files_1[_i];
                        babylonjs_1.FilesInput.FilesToLoad[f.name.toLowerCase()] = f;
                        ext = babylonjs_editor_1.Tools.GetFileExtension(f.name);
                        texture = null;
                        switch (ext) {
                            case 'dds':
                                texture = babylonjs_1.CubeTexture.CreateFromPrefilteredData('file:' + f.name, this.editor.core.scene);
                                break;
                            default:
                                texture = new babylonjs_1.Texture('file:' + f.name, this.editor.core.scene);
                                break;
                        }
                        texture.name = texture['url'] = f.name;
                        // Add preview node
                        return [4 /*yield*/, this.addPreviewNode(f, texture)];
                    case 2:
                        // Add preview node
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        ;
                        this.layout.unlockPanel('top');
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return AnimationEditor;
}(babylonjs_editor_1.EditorPlugin));
exports.default = AnimationEditor;
//# sourceMappingURL=viewer.js.map