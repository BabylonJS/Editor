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
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var PostProcessEditor = /** @class */ (function (_super) {
    __extends(PostProcessEditor, _super);
    /**
     * Constructor
     * @param name: the name of the post-process
     * @param fragmentUrl: the url of the fragment shader
     * @param camera: the camera to attach to
     * @param ratio: the ratio of the post-process
     * @param customCode: the custom code from user
     */
    function PostProcessEditor(name, fragmentUrl, camera, config, customCode) {
        var _this = 
        // BABYLON.PostProcess
        _super.call(this, name, fragmentUrl, [], ['textureSampler'], config.ratio, camera) || this;
        _this.userConfig = {};
        _this.additionalUniforms = [];
        _this.additionalSamplers = [];
        // Misc.
        _this.scene = camera.getScene();
        _this.customCode = customCode;
        _this.config = config;
        // Constructor
        customCode && customCode.prototype.init.call(_this);
        // Set uniforms
        _this.setConfig(config);
        // On apply
        _this.setOnApply();
        return _this;
    }
    /**
     * Sets the .onApply property of the post-process
     */
    PostProcessEditor.prototype.setOnApply = function () {
        var _this = this;
        this.onApply = function (effect) {
            if (_this.customCode)
                _this.customCode.prototype.onApply.call(_this, effect);
            // Set user config
            _this.config.textures.forEach(function (t) { return _this.userConfig[t] !== undefined && effect.setTexture(t, _this.userConfig[t]); });
            _this.config.floats.forEach(function (f) { return _this.userConfig[f] !== undefined && effect.setFloat(f, _this.userConfig[f] || 0); });
            _this.config.vectors2.forEach(function (v) { return _this.userConfig[v] !== undefined && effect.setVector2(v, _this.userConfig[v]); });
            _this.config.vectors3.forEach(function (v) { return _this.userConfig[v] !== undefined && effect.setVector3(v, _this.userConfig[v]); });
        };
    };
    /**
     * Sets the post-process config
     * @param config
     */
    PostProcessEditor.prototype.setConfig = function (config) {
        var uniforms = ['scale']
            .concat(config.floats)
            .concat(config.vectors2)
            .concat(config.vectors3);
        var samplers = ['textureSampler'].concat(config.textures);
        this.customCode && this.customCode.prototype.setUniforms.call(this, uniforms, samplers);
        // Update and apply config
        try {
            this.updateEffect('#define UPDATED' + babylonjs_1.Tools.RandomId() + '\n', uniforms, samplers);
            this.config = config;
            this.setOnApply();
        }
        catch (e) { }
    };
    /**
     * Disposes the post-process
     */
    PostProcessEditor.prototype.dispose = function () {
        this.customCode && this.customCode.prototype.dispose.call(this);
        _super.prototype.dispose.call(this);
    };
    /**
     * Returns the post-process class name
     */
    PostProcessEditor.prototype.getClassName = function () {
        return 'PostProcessEditor';
    };
    return PostProcessEditor;
}(babylonjs_1.PostProcess));
exports.default = PostProcessEditor;
//# sourceMappingURL=post-process.js.map