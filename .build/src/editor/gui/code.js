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
var tools_1 = require("../tools/tools");
var CodeEditor = /** @class */ (function () {
    /**
     * Constructor
     */
    function CodeEditor(language, value) {
        if (language === void 0) { language = 'javascript'; }
        if (value === void 0) { value = '// Some Code'; }
        // Public members
        this.editor = null;
        this._language = language;
        this._defaultValue = value;
    }
    /**
     * Returns the editor's value
     */
    CodeEditor.prototype.getValue = function () {
        return this.editor.getValue();
    };
    /**
     * Sets the value of the editor
     * @param value the value to set
     */
    CodeEditor.prototype.setValue = function (value) {
        this.editor.setValue(value);
    };
    /**
     * Builds the code editor
     * @param parentId the parent id of the editor
     */
    CodeEditor.prototype.build = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var libs, content, _i, libs_1, l, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!CodeEditor.ExternalLibraries) return [3 /*break*/, 5];
                        libs = [
                            'node_modules/babylonjs/babylon.d.ts',
                            'node_modules/babylonjs-gui/babylon.gui.d.ts',
                            'node_modules/babylonjs-materials/babylonjs.materials.module.d.ts',
                            'assets/templates/material-creator/custom-material.d.ts',
                            'assets/templates/post-process-creator/custom-post-process.d.ts'
                        ];
                        content = '';
                        _i = 0, libs_1 = libs;
                        _b.label = 1;
                    case 1:
                        if (!(_i < libs_1.length)) return [3 /*break*/, 4];
                        l = libs_1[_i];
                        _a = content;
                        return [4 /*yield*/, tools_1.default.LoadFile(l, false)];
                    case 2:
                        content = _a + ((_b.sent()) + '\n');
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        content += "\n                declare var scene: BABYLON.Scene;\n                declare var mesh: BABYLON.Mesh;\n                declare var pointlight: BABYLON.PointLight;\n                declare var camera: BABYLON.Camera;\n                declare var universalcamera: BABYLON.UniversalCamera;\n                declare var spotlight: BABYLON.SpotLight;\n                declare var dirlight: BABYLON.DirectionalLight;\n                declare var hemlight: BABYLON.HemisphericLight;\n                declare var groundmesh: BABYLON.GroundMesh;\n                declare var particleSystem: BABYLON.ParticleSystem;\n                declare var gpuParticleSystem: BABYLON.GPUParticleSystem;\n            ";
                        CodeEditor.ExternalLibraries = content;
                        _b.label = 5;
                    case 5:
                        this.editor = monaco.editor.create($('#' + parentId)[0], {
                            value: this._defaultValue,
                            language: this._language,
                            automaticLayout: true,
                            selectionHighlight: true
                        });
                        if (!CodeEditor.ExtraLib)
                            CodeEditor.ExtraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(CodeEditor.ExternalLibraries, 'CodeEditor');
                        this.editor.onDidChangeModelContent(function () {
                            if (_this.onChange)
                                _this.onChange(_this.editor.getValue());
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    // Static members
    CodeEditor.ExternalLibraries = null;
    return CodeEditor;
}());
exports.default = CodeEditor;
//# sourceMappingURL=code.js.map