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
var material_1 = require("./material");
var template = "\nEDITOR.MaterialCreator.Constructors['{{name}}'] = function (CustomMaterial) {\n    {{code}}\n}\n";
// Set EDITOR on Window
var EDITOR;
(function (EDITOR) {
    var MaterialCreator = /** @class */ (function () {
        function MaterialCreator() {
        }
        MaterialCreator.Constructors = {};
        return MaterialCreator;
    }());
    EDITOR.MaterialCreator = MaterialCreator;
})(EDITOR = exports.EDITOR || (exports.EDITOR = {}));
window['EDITOR'] = window['EDITOR'] || {};
window['EDITOR'].MaterialCreator = EDITOR.MaterialCreator;
// Material Creator extension class
var MaterialCreatorExtension = /** @class */ (function (_super) {
    __extends(MaterialCreatorExtension, _super);
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    function MaterialCreatorExtension(scene) {
        var _this = _super.call(this, scene) || this;
        _this.datas = [];
        return _this;
    }
    /**
     * Creates a new material
     * @param data: the data containing code, vertex, etc.
     */
    MaterialCreatorExtension.prototype.createMaterial = function (data) {
        var _this = this;
        var id = data.name + babylonjs_1.Tools.RandomId();
        babylonjs_1.Effect.ShadersStore[id + 'VertexShader'] = data.vertex;
        babylonjs_1.Effect.ShadersStore[id + 'PixelShader'] = data.pixel;
        var code = null;
        if (data.code) {
            // Add custom code
            var url = window.location.href;
            url = url.replace(babylonjs_1.Tools.GetFilename(url), '') + 'materials/' + data.name.replace(/ /g, '') + '.js';
            extension_1.default.AddScript(template.replace('{{name}}', id).replace('{{code}}', data.code), url);
            code = new Function();
            var instance = new EDITOR.MaterialCreator.Constructors[id](code);
        }
        // Custom config
        var config = null;
        try {
            config = JSON.parse(data.config);
        }
        catch (e) { }
        // Get or create material
        var material = this.scene.getMaterialByName(data.name);
        if (material) {
            material.config = config;
            material._shaderName = id;
            material.setCustomCode(code);
        }
        else
            material = new material_1.default(data.name, this.scene, id, code, config);
        // User config
        if (data.code) {
            data.userConfig.textures.forEach(function (t) { return material.userConfig[t.name] = babylonjs_1.Texture.Parse(t.value, _this.scene, 'file:'); }); // TODO: remove "file:"
            data.userConfig.floats.forEach(function (f) { return material.userConfig[f.name] = f.value; });
            data.userConfig.vectors2.forEach(function (v) { return material.userConfig[v.name] = babylonjs_1.Vector2.FromArray(v.value); });
            data.userConfig.vectors3.forEach(function (v) { return material.userConfig[v.name] = babylonjs_1.Vector3.FromArray(v.value); });
        }
        return material;
    };
    /**
     * On apply the extension
     */
    MaterialCreatorExtension.prototype.onApply = function (data) {
        var _this = this;
        this.datas = data;
        this.datas.forEach(function (d) { return _this.createMaterial(d); });
    };
    /**
     * Called by the editor when serializing the scene
     */
    MaterialCreatorExtension.prototype.onSerialize = function () {
        var _this = this;
        if (!this.scene.metadata || !this.scene.metadata['MaterialCreator'])
            return null;
        // Get data
        var data = this.scene.metadata['MaterialCreator'];
        // Apply user config
        data.forEach(function (d) {
            _this.scene.materials.forEach(function (m) {
                if (!(m instanceof material_1.default) || !m.config || m.name !== d.name)
                    return;
                d.userConfig.textures = [];
                m.config.textures.forEach(function (t) { return m.userConfig[t.name] && d.userConfig.textures.push({ value: m.userConfig[t.name].serialize(), name: t.name }); });
                d.userConfig.floats = [];
                m.config.floats.forEach(function (f) { return d.userConfig.floats.push({ value: m.userConfig[f], name: f }); });
                d.userConfig.vectors2 = [];
                m.config.vectors2.forEach(function (v) { return d.userConfig.vectors2.push({ value: m.userConfig[v].asArray(), name: v }); });
                d.userConfig.vectors3 = [];
                m.config.vectors3.forEach(function (v) { return d.userConfig.vectors3.push({ value: m.userConfig[v].asArray(), name: v }); });
            });
        });
        return data;
    };
    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    MaterialCreatorExtension.prototype.onLoad = function (data) {
        var _this = this;
        this.datas = data;
        this.scene.metadata = this.scene.metadata || {};
        this.scene.metadata['MaterialCreator'] = [];
        // For each material
        this.datas.forEach(function (d) { return _this.scene.metadata['MaterialCreator'].push(d); });
    };
    return MaterialCreatorExtension;
}(extension_1.default));
exports.default = MaterialCreatorExtension;
// Register
extensions_1.default.Register('MaterialCreatorExtension', MaterialCreatorExtension);
//# sourceMappingURL=material-creator.js.map