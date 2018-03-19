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
var extension_1 = require("../extension");
var extensions_1 = require("../extensions");
var PostProcessesExtension = /** @class */ (function (_super) {
    __extends(PostProcessesExtension, _super);
    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    function PostProcessesExtension(scene) {
        var _this = _super.call(this, scene) || this;
        // Extension
        _this.datas = {};
        return _this;
    }
    /**
     * On apply the extension
     */
    PostProcessesExtension.prototype.onApply = function (data, rootUrl) {
        this._applyPostProcesses(data, rootUrl);
    };
    /**
     * Called by the editor when serializing the scene
     */
    PostProcessesExtension.prototype.onSerialize = function () {
        var pipelines = this.scene.postProcessRenderPipelineManager['_renderPipelines'];
        var data = {};
        if (pipelines.Standard)
            data.standard = pipelines.Standard['serialize']();
        return data;
    };
    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    PostProcessesExtension.prototype.onLoad = function (data, editor) {
        // TODO: Find a way to access SceneManager
        // this._applyPostProcesses(data, 'file:');
    };
    // Applies the post-processes on the scene
    PostProcessesExtension.prototype._applyPostProcesses = function (data, rootUrl, editor) {
        if (data.standard) {
            var std = babylonjs_1.StandardRenderingPipeline.Parse(data.standard, this.scene, rootUrl);
            std._attachCameras(this.scene.cameras, true);
        }
    };
    return PostProcessesExtension;
}(extension_1.default));
exports.default = PostProcessesExtension;
extensions_1.default.Register('PostProcess', PostProcessesExtension);
//# sourceMappingURL=post-processes.js.map