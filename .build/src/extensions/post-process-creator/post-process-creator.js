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
var extensions_1 = require("../extensions");
var extension_1 = require("../extension");
var post_process_1 = require("./post-process");
var template = "\nEDITOR.PostProcessCreator.Constructors['{{name}}'] = function (CustomPostProcess, camera) {\n    {{code}}\n}\n";
// Set EDITOR on Window
var EDITOR;
(function (EDITOR) {
    var PostProcessCreator = /** @class */ (function () {
        function PostProcessCreator() {
        }
        PostProcessCreator.Constructors = {};
        return PostProcessCreator;
    }());
    EDITOR.PostProcessCreator = PostProcessCreator;
})(EDITOR = exports.EDITOR || (exports.EDITOR = {}));
window['EDITOR'] = window['EDITOR'] || {};
window['EDITOR'].PostProcessCreator = EDITOR.PostProcessCreator;
var PostProcessCreatorExtension = /** @class */ (function (_super) {
    __extends(PostProcessCreatorExtension, _super);
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    function PostProcessCreatorExtension(scene) {
        var _this = _super.call(this, scene) || this;
        _this.datas = [];
        return _this;
    }
    /**
     * Creates a new post-process
     * @param data: the data containing code, pixel, etc.
     */
    PostProcessCreatorExtension.prototype.createPostProcess = function (data) {
        var _this = this;
        var id = data.name + babylonjs_1.Tools.RandomId();
        // Add custom code
        babylonjs_1.Effect.ShadersStore[id + 'PixelShader'] = data.pixel;
        var url = window.location.href;
        url = url.replace(babylonjs_1.Tools.GetFilename(url), '') + 'post-processes/' + data.name.replace(/ /g, '') + '.js';
        extension_1.default.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.code), url);
        var code = new Function();
        var camera = this.scene.getCameraByName(data.cameraName) || this.scene.activeCamera;
        var instance = new EDITOR.PostProcessCreator.Constructors[id](code, camera);
        // Custom config
        var config = null;
        try {
            config = JSON.parse(data.config);
        }
        catch (e) { }
        // Create post-process
        var postprocess = new post_process_1.default(data.name, id, camera, config, code);
        // User config
        data.userConfig.textures.forEach(function (t) { return postprocess.userConfig[t.name] = babylonjs_1.Texture.Parse(t.value, _this.scene, 'file:'); }); // TODO: remove "file:"
        data.userConfig.floats.forEach(function (f) { return postprocess.userConfig[f.name] = f.value; });
        data.userConfig.vectors2.forEach(function (v) { return postprocess.userConfig[v.name] = babylonjs_1.Vector2.FromArray(v.value); });
        data.userConfig.vectors3.forEach(function (v) { return postprocess.userConfig[v.name] = babylonjs_1.Vector3.FromArray(v.value); });
        // Return post-process
        return postprocess;
    };
    /**
     * On apply the extension
     */
    PostProcessCreatorExtension.prototype.onApply = function (data) {
        var _this = this;
        this.datas = data;
        this.datas.forEach(function (d) { return _this.createPostProcess(d); });
    };
    /**
     * Called by the editor when serializing the scene
     */
    PostProcessCreatorExtension.prototype.onSerialize = function () {
        var _this = this;
        if (!this.scene.metadata || !this.scene.metadata['PostProcessCreator'])
            return null;
        // Get data
        var data = this.scene.metadata['PostProcessCreator'];
        // Apply user config
        data.forEach(function (d) {
            _this.scene.postProcesses.forEach(function (p) {
                if (!(p instanceof post_process_1.default) || !p.config || p.name !== d.name)
                    return;
                d.userConfig.textures = [];
                p.config.textures.forEach(function (t) { return p.userConfig[t] && d.userConfig.textures.push({ value: p.userConfig[t].serialize(), name: t }); });
                d.userConfig.floats = [];
                p.config.floats.forEach(function (f) { return d.userConfig.floats.push({ value: p.userConfig[f], name: f }); });
                d.userConfig.vectors2 = [];
                p.config.vectors2.forEach(function (v) { return d.userConfig.vectors2.push({ value: p.userConfig[v].asArray(), name: v }); });
                d.userConfig.vectors3 = [];
                p.config.vectors3.forEach(function (v) { return d.userConfig.vectors3.push({ value: p.userConfig[v].asArray(), name: v }); });
            });
        });
        return data;
    };
    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    PostProcessCreatorExtension.prototype.onLoad = function (data) {
        var _this = this;
        this.datas = data;
        this.scene.metadata = this.scene.metadata || {};
        this.scene.metadata['PostProcessCreator'] = [];
        // For each material
        this.datas.forEach(function (d) { return _this.scene.metadata['PostProcessCreator'].push(d); });
    };
    return PostProcessCreatorExtension;
}(extension_1.default));
exports.default = PostProcessCreatorExtension;
// Register
extensions_1.default.Register('PostProcessCreatorExtension', PostProcessCreatorExtension);
//# sourceMappingURL=post-process-creator.js.map