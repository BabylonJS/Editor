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
var edition_tool_1 = require("../edition-tool");
var tools_1 = require("../../tools/tools");
var scene_manager_1 = require("../../scene/scene-manager");
var picker_1 = require("../../gui/picker");
var extensions_1 = require("../../../extensions/extensions");
var PostProcessesTool = /** @class */ (function (_super) {
    __extends(PostProcessesTool, _super);
    function PostProcessesTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'POST-PROCESSES-TOOL';
        _this.tabName = 'Post-Processes';
        // Private members
        _this._standardEnabled = false;
        _this._ssaoEnabled = false;
        _this._ssao2Enabled = false;
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    PostProcessesTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Scene;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    PostProcessesTool.prototype.update = function (scene) {
        var _this = this;
        _super.prototype.update.call(this, scene);
        // Default
        var standardPipeline = this.tool.addFolder('Standard');
        standardPipeline.open();
        this._standardEnabled = scene_manager_1.default.StandardRenderingPipeline !== null;
        standardPipeline.add(this, '_standardEnabled').name('Enable').onChange(function (r) { return __awaiter(_this, void 0, void 0, function () {
            var pipeline;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!r) return [3 /*break*/, 1];
                        scene_manager_1.default.StandardRenderingPipeline.dispose();
                        scene_manager_1.default.StandardRenderingPipeline = null;
                        return [3 /*break*/, 5];
                    case 1:
                        pipeline = new babylonjs_1.StandardRenderingPipeline('Standard', scene, 1.0, null, scene.cameras);
                        pipeline.depthOfFieldDistance = 0.05;
                        return [4 /*yield*/, tools_1.default.CreateFileFromURL('assets/textures/lensflaredirt.png')];
                    case 2:
                        _a.sent();
                        pipeline.lensTexture = pipeline.lensFlareDirtTexture = new babylonjs_1.Texture('file:lensflaredirt.png', scene);
                        return [4 /*yield*/, tools_1.default.CreateFileFromURL('assets/textures/lensstar.png')];
                    case 3:
                        _a.sent();
                        pipeline.lensStarTexture = new babylonjs_1.Texture('file:lensstar.png', scene);
                        return [4 /*yield*/, tools_1.default.CreateFileFromURL('assets/textures/lenscolor.png')];
                    case 4:
                        _a.sent();
                        pipeline.lensColorTexture = new babylonjs_1.Texture('file:lenscolor.png', scene);
                        pipeline.lensTexture.url = pipeline.lensTexture.name = pipeline.lensTexture.url.replace('file:', '');
                        pipeline.lensStarTexture.url = pipeline.lensStarTexture.name = pipeline.lensStarTexture.url.replace('file:', '');
                        pipeline.lensColorTexture.url = pipeline.lensColorTexture.name = pipeline.lensColorTexture.url.replace('file:', '');
                        scene_manager_1.default.StandardRenderingPipeline = pipeline;
                        _a.label = 5;
                    case 5:
                        // Update tool
                        this.update(scene);
                        // Check if extension is created
                        this._checkExtension();
                        return [2 /*return*/];
                }
            });
        }); });
        if (this._standardEnabled) {
            var bloom = standardPipeline.addFolder('Bloom');
            bloom.open();
            bloom.add(scene_manager_1.default.StandardRenderingPipeline, 'BloomEnabled').name('Bloom Enabled');
            bloom.add(scene_manager_1.default.StandardRenderingPipeline, 'exposure').min(0).max(10).step(0.01).name('Exposure');
            bloom.add(scene_manager_1.default.StandardRenderingPipeline, 'brightThreshold').min(0).max(10).step(0.01).name('Bright Threshold');
            bloom.add(scene_manager_1.default.StandardRenderingPipeline, 'blurWidth').min(0).max(512).step(0.01).name('Blur Width');
            bloom.add(scene_manager_1.default.StandardRenderingPipeline, 'horizontalBlur').name('Horizontal Blur');
            var motionBlur = standardPipeline.addFolder('Motion Blur');
            motionBlur.open();
            motionBlur.add(scene_manager_1.default.StandardRenderingPipeline, 'MotionBlurEnabled').name('Motion Blur Enabled');
            motionBlur.add(scene_manager_1.default.StandardRenderingPipeline, 'motionBlurSamples').min(1).max(64).step(1).name('Samples Count');
            motionBlur.add(scene_manager_1.default.StandardRenderingPipeline, 'motionStrength').min(0).step(0.01).name('Strength');
            var lensFlare = standardPipeline.addFolder('Lens Flare');
            lensFlare.open();
            lensFlare.add(scene_manager_1.default.StandardRenderingPipeline, 'LensFlareEnabled').name('Lens Flare Enabled');
            lensFlare.add(scene_manager_1.default.StandardRenderingPipeline, 'lensFlareStrength').min(0).max(100).step(0.01).name('Strength');
            lensFlare.add(scene_manager_1.default.StandardRenderingPipeline, 'lensFlareHaloWidth').min(0).max(2).step(0.01).name('Halo Width');
            lensFlare.add(scene_manager_1.default.StandardRenderingPipeline, 'lensFlareGhostDispersal').min(0).max(10).step(0.1).name('Ghost Dispersal');
            lensFlare.add(scene_manager_1.default.StandardRenderingPipeline, 'lensFlareDistortionStrength').min(0).max(500).step(0.1).name('Distortion Strength');
            var dof = standardPipeline.addFolder('Depth-Of-Field');
            dof.open();
            dof.add(scene_manager_1.default.StandardRenderingPipeline, 'DepthOfFieldEnabled').name('Depth-Of-Field Enabled');
            dof.add(scene_manager_1.default.StandardRenderingPipeline, 'depthOfFieldDistance').min(0).max(1).step(0.001).name('DOF Distance');
            dof.add(scene_manager_1.default.StandardRenderingPipeline, 'depthOfFieldBlurWidth').min(0).max(512).name('Blur Width');
            var hdr = standardPipeline.addFolder('HDR');
            hdr.open();
            hdr.add(scene_manager_1.default.StandardRenderingPipeline, 'HDREnabled').name('HDR Enabled');
            hdr.add(scene_manager_1.default.StandardRenderingPipeline, 'hdrMinimumLuminance').min(0).max(2).name('Minimum Luminance');
            hdr.add(scene_manager_1.default.StandardRenderingPipeline, 'hdrDecreaseRate').min(0).max(2).name('Decrease Rate');
            hdr.add(scene_manager_1.default.StandardRenderingPipeline, 'hdrIncreaseRate').min(0).max(2).name('Increase Rate');
            var vls = standardPipeline.addFolder('Volumetric Lights');
            vls.open();
            vls.add(scene_manager_1.default.StandardRenderingPipeline, 'VLSEnabled').name('Volumetric Lights Enabled').onChange(function (r) {
                var picker = new picker_1.default('Select Light Emitter');
                picker.addItems(scene.lights.map(function (l) { return (l instanceof babylonjs_1.SpotLight || l instanceof babylonjs_1.DirectionalLight) && l; }));
                picker.open(function (items) {
                    if (items.length > 0)
                        scene_manager_1.default.StandardRenderingPipeline.sourceLight = scene.getLightByName(items[0].name);
                    _this.update(scene);
                });
            });
            if (scene_manager_1.default.StandardRenderingPipeline.VLSEnabled) {
                vls.add(scene_manager_1.default.StandardRenderingPipeline, 'volumetricLightCoefficient').min(0).max(1).step(0.01).name('Scattering Coefficient');
                vls.add(scene_manager_1.default.StandardRenderingPipeline, 'volumetricLightPower').min(0).max(10).step(0.01).name('Scattering Power');
                vls.add(scene_manager_1.default.StandardRenderingPipeline, 'volumetricLightBlurScale').min(0).max(64).step(1).name('Blur scale');
                vls.add(scene_manager_1.default.StandardRenderingPipeline, 'volumetricLightStepsCount').min(0).max(100).step(1).name('Steps count');
            }
        }
        // SSAO
        var ssao = this.tool.addFolder('SSAO');
        ssao.open();
        this._ssaoEnabled = scene_manager_1.default.SSAORenderingPipeline !== null;
        ssao.add(this, '_ssaoEnabled').name('Enable').onChange(function (r) { return __awaiter(_this, void 0, void 0, function () {
            var pipeline;
            return __generator(this, function (_a) {
                if (!r) {
                    scene_manager_1.default.SSAORenderingPipeline.dispose();
                    scene_manager_1.default.SSAORenderingPipeline = null;
                }
                else {
                    pipeline = new babylonjs_1.SSAORenderingPipeline('SSAO', scene, { ssaoRatio: 0.5, combineRatio: 1.0 }, scene.cameras);
                    pipeline.fallOff = 0.000001;
                    pipeline.area = 1.0;
                    pipeline.radius = 0.0004;
                    pipeline.totalStrength = 2;
                    pipeline.base = 1.3;
                    scene_manager_1.default.SSAORenderingPipeline = pipeline;
                }
                this.update(scene);
                return [2 /*return*/];
            });
        }); });
        if (this._ssaoEnabled) {
            ssao.add(scene_manager_1.default.SSAORenderingPipeline, 'totalStrength').min(0).step(0.0001).name('Strength');
            ssao.add(scene_manager_1.default.SSAORenderingPipeline, 'radius').min(0).step(0.0001).name('Radius');
            ssao.add(scene_manager_1.default.SSAORenderingPipeline, 'area').min(0).step(0.0001).name('Area');
            ssao.add(scene_manager_1.default.SSAORenderingPipeline, 'fallOff').min(0).step(0.0001).name('Fall Off');
            ssao.add(scene_manager_1.default.SSAORenderingPipeline, 'base').min(0).step(0.0001).name('Base');
        }
        // SSAO 2
        var ssao2 = this.tool.addFolder('SSAO 2');
        ssao2.open();
        this._ssao2Enabled = scene_manager_1.default.SSAO2RenderingPipeline !== null;
        ssao2.add(this, '_ssao2Enabled').name('Enable').onChange(function (r) { return __awaiter(_this, void 0, void 0, function () {
            var pipeline;
            return __generator(this, function (_a) {
                if (!r) {
                    scene_manager_1.default.SSAO2RenderingPipeline.dispose();
                    scene_manager_1.default.SSAO2RenderingPipeline = null;
                }
                else {
                    pipeline = new babylonjs_1.SSAO2RenderingPipeline('SSAO2', scene, { ssaoRatio: 0.5, blurRatio: 0.5 }, scene.cameras);
                    pipeline.radius = 3.5;
                    pipeline.totalStrength = 1.3;
                    pipeline.expensiveBlur = true;
                    pipeline.samples = 16;
                    pipeline.maxZ = 250;
                    scene_manager_1.default.SSAO2RenderingPipeline = pipeline;
                }
                this.update(scene);
                return [2 /*return*/];
            });
        }); });
        if (this._ssao2Enabled) {
            ssao2.add(scene_manager_1.default.SSAO2RenderingPipeline, 'totalStrength').min(0).step(0.0001).name('Strength');
            ssao2.add(scene_manager_1.default.SSAO2RenderingPipeline, 'radius').min(0).step(0.0001).name('Radius');
            ssao2.add(scene_manager_1.default.SSAO2RenderingPipeline, 'expensiveBlur').name('Expensive Blur');
            ssao2.add(scene_manager_1.default.SSAO2RenderingPipeline, 'maxZ').min(0).step(0.01).name('Max Z');
            ssao2.add(scene_manager_1.default.SSAO2RenderingPipeline, 'samples').min(0).max(64).step(1).name('Samples');
        }
    };
    // Checks if the post processes extension is created
    PostProcessesTool.prototype._checkExtension = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, tools_1.default.ImportScript('./.build/src/extensions/post-process/post-processes')];
                    case 1:
                        _a.sent();
                        scene_manager_1.default.PostProcessExtension =
                            scene_manager_1.default.PostProcessExtension ||
                                extensions_1.default.RequestExtension(this.editor.core.scene, 'PostProcess');
                        return [2 /*return*/];
                }
            });
        });
    };
    return PostProcessesTool;
}(edition_tool_1.default));
exports.default = PostProcessesTool;
//# sourceMappingURL=post-processes-tool.js.map