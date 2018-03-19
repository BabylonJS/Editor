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
var scene_manager_1 = require("./scene-manager");
var tools_1 = require("../tools/tools");
var extensions_1 = require("../../extensions/extensions");
var randomId = babylonjs_1.Tools.RandomId();
var SceneExporter = /** @class */ (function () {
    function SceneExporter() {
    }
    /**
     * Creates a new file
     * @param editor: the editor instance
     */
    SceneExporter.CreateFiles = function (editor) {
        // Scene
        var serializedScene = babylonjs_1.SceneSerializer.Serialize(editor.core.scene);
        if (editor.playCamera)
            serializedScene.activeCameraID = editor.playCamera.id;
        var file = tools_1.default.CreateFile(tools_1.default.ConvertStringToUInt8Array(JSON.stringify(serializedScene)), 'scene.babylon');
        editor.sceneFile = file;
        // Project
        var name = 'scene' + randomId + '.editorproject';
        var project = this.Export(editor);
        file = tools_1.default.CreateFile(tools_1.default.ConvertStringToUInt8Array(JSON.stringify(project)), name);
        editor.projectFile = file;
    };
    /**
     * Creates the babylon scene and a download link for the babylon file
     * @param editor the editor reference
     */
    SceneExporter.DownloadBabylonFile = function (editor) {
        this.CreateFiles(editor);
        if (this._LastBabylonFileURL)
            URL.revokeObjectURL(this._LastBabylonFileURL);
        this._LastBabylonFileURL = URL.createObjectURL(editor.sceneFile);
        var link = document.createElement('a');
        link.download = editor.sceneFile.name;
        link.href = this._LastBabylonFileURL;
        link.click();
        link.remove();
    };
    /**
     * Uploads all scene templates
     * @param editor the editor reference
     */
    SceneExporter.ExportTemplate = function (editor) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var sceneFiles, _a, srcFiles, _b, distFiles, _c, _d, _e, _f, storage, _g, _h, _j, _k, _l, _m, _o, _p;
            return __generator(this, function (_q) {
                switch (_q.label) {
                    case 0:
                        this.CreateFiles(editor);
                        _a = { name: 'scene.babylon' };
                        return [4 /*yield*/, tools_1.default.ReadFileAsArrayBuffer(editor.sceneFile)];
                    case 1:
                        sceneFiles = [
                            (_a.data = _q.sent(), _a),
                            { name: 'project.editorproject', data: JSON.stringify(this.Export(editor).customMetadatas) }
                        ];
                        Object.keys(babylonjs_1.FilesInput.FilesToLoad).forEach(function (k) { return __awaiter(_this, void 0, void 0, function () { var _a, _b, _c; return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    _b = (_a = sceneFiles).push;
                                    _c = { name: k };
                                    return [4 /*yield*/, tools_1.default.ReadFileAsArrayBuffer(babylonjs_1.FilesInput.FilesToLoad[k])];
                                case 1: return [2 /*return*/, _b.apply(_a, [(_c.data = _d.sent(), _c)])];
                            }
                        }); }); });
                        _b = { name: 'game.ts' };
                        return [4 /*yield*/, tools_1.default.LoadFile('assets/templates/template/src/game.ts')];
                    case 2:
                        srcFiles = [
                            (_b.data = _q.sent(), _b)
                        ];
                        _c = { name: 'editor.extensions.js' };
                        return [4 /*yield*/, tools_1.default.LoadFile('dist/editor.extensions.js')];
                    case 3:
                        _d = [
                            (_c.data = _q.sent(), _c)
                        ];
                        _e = { name: 'babylonjs-editor.d.ts' };
                        return [4 /*yield*/, tools_1.default.LoadFile('babylonjs-editor.d.ts')];
                    case 4:
                        _d = _d.concat([
                            (_e.data = _q.sent(), _e)
                        ]);
                        _f = { name: 'babylonjs-editor-extensions.d.ts' };
                        return [4 /*yield*/, tools_1.default.LoadFile('babylonjs-editor-extensions.d.ts')];
                    case 5:
                        distFiles = _d.concat([
                            (_f.data = _q.sent(), _f)
                        ]);
                        return [4 /*yield*/, this.GetStorage(editor)];
                    case 6:
                        storage = _q.sent();
                        _h = (_g = storage).openPicker;
                        _j = ['Create Template...'];
                        _k = [{ name: 'scene', folder: sceneFiles },
                            { name: 'src', folder: srcFiles },
                            { name: 'libs', folder: distFiles }];
                        _l = { name: 'README.md' };
                        return [4 /*yield*/, tools_1.default.LoadFile('assets/templates/template/README.md')];
                    case 7:
                        _k = _k.concat([
                            (_l.data = _q.sent(), _l)
                        ]);
                        _m = { name: 'index.html' };
                        return [4 /*yield*/, tools_1.default.LoadFile('assets/templates/template/index.html')];
                    case 8:
                        _k = _k.concat([
                            (_m.data = _q.sent(), _m)
                        ]);
                        _o = { name: 'package.json' };
                        return [4 /*yield*/, tools_1.default.LoadFile('assets/templates/template/package.json')];
                    case 9:
                        _k = _k.concat([
                            (_o.data = _q.sent(), _o)
                        ]);
                        _p = { name: 'tsconfig.json' };
                        return [4 /*yield*/, tools_1.default.LoadFile('assets/templates/template/tsconfig.json')];
                    case 10:
                        _h.apply(_g, _j.concat([_k.concat([
                                (_p.data = _q.sent(), _p)
                            ])]));
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Exports the editor project into the storage
     * @param editor the editor reference
     */
    SceneExporter.ExportProject = function (editor) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var content, storage, files;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        content = JSON.stringify(this.Export(editor));
                        return [4 /*yield*/, this.GetStorage(editor)];
                    case 1:
                        storage = _a.sent();
                        files = [{ name: 'scene.editorproject', data: content }];
                        storage.onCreateFiles = function (folder) { return _this.ProjectPath = folder; };
                        storage.openPicker('Export Editor Project...', files, this.ProjectPath);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Returns the appropriate storage (OneDrive, Electron, etc.)
     * @param editor the editor reference
     */
    SceneExporter.GetStorage = function (editor) {
        return __awaiter(this, void 0, void 0, function () {
            var storage, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!tools_1.default.IsElectron()) return [3 /*break*/, 2];
                        return [4 /*yield*/, tools_1.default.ImportScript('.build/src/editor/storage/electron-storage.js')];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, tools_1.default.ImportScript('.build/src/editor/storage/one-drive-storage.js')];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        storage = _a;
                        return [2 /*return*/, new storage.default(editor)];
                }
            });
        });
    };
    /**
     * Exports the current editor project
     */
    SceneExporter.Export = function (editor) {
        // Toggle scene manager
        scene_manager_1.default.Toggle(editor.core.scene);
        var project = {
            actions: null,
            customMetadatas: this._SerializeCustomMetadatas(editor),
            globalConfiguration: null,
            lensFlares: null,
            materials: this._SerializeMaterials(editor),
            nodes: this._SerializeNodes(editor),
            particleSystems: this._SerializeParticleSystems(editor),
            physicsEnabled: editor.core.scene.isPhysicsEnabled(),
            postProcesses: null,
            renderTargets: null,
            requestedMaterials: null,
            shadowGenerators: this._SerializeShadowGenerators(editor),
            sounds: null
        };
        // Finish
        scene_manager_1.default.Toggle(editor.core.scene);
        return project;
    };
    /**
     * Serializes the custom metadatas
     */
    SceneExporter._SerializeCustomMetadatas = function (editor) {
        var result = {};
        // Instances have been
        for (var e in extensions_1.default.Instances)
            result[e] = extensions_1.default.Instances[e].onSerialize();
        return result;
    };
    /**
     * Serializes the shadow generators
     */
    SceneExporter._SerializeShadowGenerators = function (editor) {
        var result = [];
        editor.core.scene.lights.forEach(function (l) {
            var sg = l.getShadowGenerator();
            if (!sg || !babylonjs_1.Tags.HasTags(sg) || !babylonjs_1.Tags.MatchesQuery(sg, 'added'))
                return;
            result.push(sg.serialize());
        });
        return result;
    };
    /**
     * Serializes the Materials
     */
    SceneExporter._SerializeMaterials = function (editor) {
        var scene = editor.core.scene;
        var result = [];
        scene.materials.forEach(function (m) {
            if (!babylonjs_1.Tags.HasTags(m) || !babylonjs_1.Tags.MatchesQuery(m, 'added'))
                return;
            // Already serialized?
            var material = result.find(function (mat) { return mat.serializedValues.name === m.name; });
            if (material)
                return;
            // Add new material
            var names = [];
            scene.meshes.map(function (mesh) {
                if (mesh.material === m)
                    names.push(mesh.name);
            });
            result.push({
                meshesNames: names,
                newInstance: true,
                serializedValues: m.serialize()
            });
        });
        return result;
    };
    /**
     * Serializes the Particle Systems
     */
    SceneExporter._SerializeParticleSystems = function (editor) {
        var scene = editor.core.scene;
        var result = [];
        scene.particleSystems.forEach(function (ps) {
            if (!babylonjs_1.Tags.HasTags(ps) || !babylonjs_1.Tags.MatchesQuery(ps, 'added'))
                return;
            result.push({
                emitterPosition: (ps.emitter && ps.emitter instanceof babylonjs_1.Vector3) ? ps.emitter.asArray() : null,
                hasEmitter: ps.emitter && ps.emitter instanceof babylonjs_1.AbstractMesh,
                serializationObject: ps.serialize()
            });
        });
        return result;
    };
    /**
     * Serializes the nodes
     */
    SceneExporter._SerializeNodes = function (editor) {
        var scene = editor.core.scene;
        var nodes = []
            .concat(scene.meshes)
            .concat(scene.lights)
            .concat(scene.cameras)
            .filter(function (n) { return n !== editor.camera; });
        var result = [];
        nodes.forEach(function (n) {
            var addNodeToProject = false;
            var node = {
                actions: null,
                animations: [],
                id: n.id,
                name: n.name,
                serializationObject: null,
                physics: null,
                type: n instanceof babylonjs_1.AbstractMesh ? 'Mesh' :
                    n instanceof babylonjs_1.Light ? 'Light' :
                        n instanceof babylonjs_1.Camera ? 'Camera' : 'Unknown!'
            };
            if (babylonjs_1.Tags.HasTags(n) && babylonjs_1.Tags.MatchesQuery(n, 'added')) {
                addNodeToProject = true;
                if (n instanceof babylonjs_1.AbstractMesh)
                    node.serializationObject = babylonjs_1.SceneSerializer.SerializeMesh(n, false, false);
                else
                    node.serializationObject = n.serialize();
            }
            // Animations
            n.animations.forEach(function (a) {
                if (!babylonjs_1.Tags.HasTags(a) || !babylonjs_1.Tags.MatchesQuery(a, 'added'))
                    return;
                addNodeToProject = true;
                node.animations.push({
                    events: [],
                    serializationObject: a.serialize(),
                    targetName: name,
                    targetType: 'Node'
                });
            });
            // Physics
            if (n instanceof babylonjs_1.AbstractMesh) {
                var impostor = n.getPhysicsImpostor();
                if (impostor && babylonjs_1.Tags.HasTags(impostor) && babylonjs_1.Tags.MatchesQuery(impostor, 'added')) {
                    addNodeToProject = true;
                    node.physics = {
                        physicsMass: impostor.getParam("mass"),
                        physicsFriction: impostor.getParam("friction"),
                        physicsRestitution: impostor.getParam("restitution"),
                        physicsImpostor: impostor.type
                    };
                }
            }
            // Actions
            var actionManager = n['actionManager'];
            if (actionManager && babylonjs_1.Tags.HasTags(actionManager) && babylonjs_1.Tags.MatchesQuery(actionManager, 'added')) {
                addNodeToProject = true;
                node.actions = actionManager.serialize(name);
            }
            // Add to nodes project?
            if (addNodeToProject)
                result.push(node);
        });
        return result;
    };
    // Public members
    SceneExporter.ProjectPath = null;
    // Private members
    SceneExporter._LastBabylonFileURL = null;
    return SceneExporter;
}());
exports.default = SceneExporter;
//# sourceMappingURL=scene-exporter.js.map