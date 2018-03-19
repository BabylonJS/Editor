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
var edition_tool_1 = require("./edition-tool");
var tools_1 = require("../tools/tools");
var scene_manager_1 = require("../scene/scene-manager");
var SceneTool = /** @class */ (function (_super) {
    __extends(SceneTool, _super);
    function SceneTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'SCENE-TOOL';
        _this.tabName = 'Scene';
        // Private members
        _this._physicsEnabled = false;
        _this._fogMode = '';
        _this._glowEnabled = false;
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    SceneTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Scene;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    SceneTool.prototype.update = function (scene) {
        var _this = this;
        _super.prototype.update.call(this, scene);
        // Misc.
        this._physicsEnabled = scene.isPhysicsEnabled();
        this._glowEnabled = scene_manager_1.default.GlowLayer !== null;
        // Colors
        var colors = this.tool.addFolder('Colors');
        colors.open();
        this.tool.addColor(colors, 'Ambient', scene.ambientColor).open();
        this.tool.addColor(colors, 'Clear', scene.clearColor).open();
        // Image processing
        var imageProcessing = this.tool.addFolder('Image Processing');
        imageProcessing.open();
        imageProcessing.add(scene.imageProcessingConfiguration, 'exposure').step(0.01).name('Exposure');
        imageProcessing.add(scene.imageProcessingConfiguration, 'contrast').step(0.01).name('Contrast');
        imageProcessing.add(scene.imageProcessingConfiguration, 'toneMappingEnabled').name('Tone Mapping Enabled');
        // Glow layer
        var glow = this.tool.addFolder('Glow Layer');
        glow.open();
        glow.add(this, '_glowEnabled').name('Enable Glow Layer').onFinishChange(function (r) {
            if (!r) {
                scene_manager_1.default.GlowLayer.dispose();
                scene_manager_1.default.GlowLayer = null;
            }
            else
                scene_manager_1.default.GlowLayer = new babylonjs_1.GlowLayer('GlowLayer', scene);
            _this.update(scene);
        });
        if (this._glowEnabled) {
            glow.add(scene_manager_1.default.GlowLayer, 'intensity').min(0).step(0.01).name('Intensity');
            glow.add(scene_manager_1.default.GlowLayer, 'blurKernelSize').min(0).max(128).step(1).name('Blur Size');
        }
        // Environment texture
        var environment = this.tool.addFolder('Environment Texture');
        environment.open();
        this.tool.addTexture(environment, this.editor, 'environmentTexture', scene, true, true).name('Environment Texture');
        // Collisions
        var collisions = this.tool.addFolder('Collisions');
        collisions.open();
        collisions.add(scene, 'collisionsEnabled').name('Collisions Enabled');
        this.tool.addVector(collisions, 'Gravity', scene.gravity, function () {
            var physics = scene.getPhysicsEngine();
            if (physics)
                physics.setGravity(scene.gravity);
        });
        // Physics
        var physics = this.tool.addFolder('Physics');
        physics.open();
        physics.add(this, '_physicsEnabled').name('Physics Enabled').onFinishChange(function (r) { return __awaiter(_this, void 0, void 0, function () {
            var cannonjs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!r) return [3 /*break*/, 2];
                        this.editor.layout.lockPanel('left', 'Enabling...', true);
                        return [4 /*yield*/, tools_1.default.ImportScript('cannonjs')];
                    case 1:
                        cannonjs = _a.sent();
                        scene.enablePhysics(new babylonjs_1.Vector3(0, -0.91, 0), new babylonjs_1.CannonJSPlugin(true));
                        scene.getPhysicsEngine().setTimeStep(0);
                        this.editor.layout.unlockPanel('left');
                        return [3 /*break*/, 3];
                    case 2:
                        scene.disablePhysicsEngine();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
        // Audio
        var audio = this.tool.addFolder('Audio');
        audio.open();
        audio.add(scene, 'audioEnabled').name('Enable Audio');
        // Fog
        var fog = this.tool.addFolder('Fog');
        fog.open();
        fog.add(scene, 'fogEnabled').name('Enable Fog');
        fog.add(scene, 'fogStart').name('Fog Start');
        fog.add(scene, 'fogEnd').name('Fog End');
        fog.add(scene, 'fogDensity').name('Fog Density');
        var fogModes = ['FOGMODE_NONE', 'FOGMODE_LINEAR', 'FOGMODE_EXP', 'FOGMODE_EXP2'];
        this._fogMode = fogModes[0];
        for (var _i = 0, fogModes_1 = fogModes; _i < fogModes_1.length; _i++) {
            var mode = fogModes_1[_i];
            if (scene.fogMode === babylonjs_1.Scene[mode]) {
                this._fogMode = mode;
                break;
            }
        }
        fog.add(this, '_fogMode', fogModes).name('Fog Mode').onFinishChange(function (r) {
            scene.fogMode = babylonjs_1.Scene[r];
        });
        this.tool.addColor(fog, 'Color', scene.fogColor).open();
    };
    return SceneTool;
}(edition_tool_1.default));
exports.default = SceneTool;
//# sourceMappingURL=scene-tool.js.map