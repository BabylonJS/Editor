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
var template = "\nEDITOR.BehaviorCode.Constructors['{{name}}'] = function (scene, {{node}}) {\n    {{code}}\n}\n";
// Set EDITOR on Window
var EDITOR;
(function (EDITOR) {
    var BehaviorCode = /** @class */ (function () {
        function BehaviorCode() {
        }
        BehaviorCode.Constructors = {};
        return BehaviorCode;
    }());
    EDITOR.BehaviorCode = BehaviorCode;
})(EDITOR = exports.EDITOR || (exports.EDITOR = {}));
window['EDITOR'] = window['EDITOR'] || {};
window['EDITOR'].BehaviorCode = EDITOR.BehaviorCode;
// Code extension class
var CodeExtension = /** @class */ (function (_super) {
    __extends(CodeExtension, _super);
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    function CodeExtension(scene) {
        var _this = _super.call(this, scene) || this;
        _this.datas = [];
        return _this;
    }
    /**
     * On apply the extension
     */
    CodeExtension.prototype.onApply = function (data) {
        var _this = this;
        this.datas = data;
        // For each node
        this.datas.forEach(function (d) {
            var node = d.node === 'Scene' ? _this.scene : _this.scene.getNodeByName(d.node);
            if (!node)
                _this.scene.particleSystems.forEach(function (ps) { return ps.name === d.node && (node = ps); });
            if (!node)
                return;
            d.metadatas.forEach(function (m) {
                if (!m.active)
                    return;
                var url = window.location.href;
                url = url.replace(babylonjs_1.Tools.GetFilename(url), '') + 'behaviors/' + (node instanceof babylonjs_1.Scene ? 'scene/' : node.name.replace(/ /g, '') + '/') + m.name.replace(/ /g, '') + '.js';
                var fnName = (node instanceof babylonjs_1.Scene ? 'scene' : node.name.replace(/ /g, '')) + m.name.replace(/ /g, '');
                // Create script tag
                extension_1.default.AddScript(template.replace('{{name}}', fnName).replace('{{node}}', _this._getConstructorName(node)).replace('{{code}}', m.code), url);
                // Create instance
                var instance = new EDITOR.BehaviorCode.Constructors[fnName](_this.scene, node);
                var scope = _this;
                if (instance.start) {
                    _this.scene.registerBeforeRender(function () {
                        instance.start();
                        scope.scene.unregisterBeforeRender(this.callback);
                    });
                }
                if (instance.update) {
                    _this.scene.registerBeforeRender(function () {
                        instance.update();
                    });
                }
            });
        });
    };
    /**
     * Called by the editor when serializing the scene
     */
    CodeExtension.prototype.onSerialize = function () {
        var result = [];
        var add = function (objects) {
            objects.forEach(function (o) {
                if (o['metadata'] && o['metadata']['behavior'])
                    result.push(o['metadata']['behavior']);
            });
        };
        add(this.scene.meshes);
        add(this.scene.lights);
        add(this.scene.cameras);
        add([this.scene]);
        add(this.scene.particleSystems);
        return result;
    };
    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    CodeExtension.prototype.onLoad = function (data) {
        var _this = this;
        this.datas = data;
        // For each node
        this.datas.forEach(function (d) {
            var node = d.node === 'Scene' ? _this.scene : _this.scene.getNodeByName(d.node);
            if (!node)
                return;
            node.metadata = node.metadata || {};
            node.metadata['behavior'] = d;
        });
    };
    // Returns the name of the "obj" constructor
    CodeExtension.prototype._getConstructorName = function (obj) {
        if (obj instanceof babylonjs_1.DirectionalLight)
            return "dirlight";
        if (obj instanceof babylonjs_1.HemisphericLight)
            return "hemlight";
        var ctrName = (obj && obj.constructor) ? obj.constructor.name : "";
        if (ctrName === "") {
            ctrName = typeof obj;
        }
        return ctrName.toLowerCase();
    };
    return CodeExtension;
}(extension_1.default));
exports.default = CodeExtension;
// Register
extensions_1.default.Register('BehaviorExtension', CodeExtension);
//# sourceMappingURL=code.js.map