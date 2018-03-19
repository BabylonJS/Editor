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
var edition_tool_1 = require("./edition-tool");
var picker_1 = require("../gui/picker");
var SoundTool = /** @class */ (function (_super) {
    __extends(SoundTool, _super);
    function SoundTool() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // Public members
        _this.divId = 'SOUND-TOOL';
        _this.tabName = 'Sound';
        // Private members
        _this._volume = 0;
        _this._playbackRate = 0;
        _this._rolloffFactor = 0;
        _this._position = babylonjs_1.Vector3.Zero();
        return _this;
    }
    /**
    * Returns if the object is supported
    * @param object the object selected in the graph
    */
    SoundTool.prototype.isSupported = function (object) {
        return object instanceof babylonjs_1.Sound;
    };
    /**
    * Updates the edition tool
    * @param object the object selected in the graph
    */
    SoundTool.prototype.update = function (sound) {
        var _this = this;
        _super.prototype.update.call(this, sound);
        // Common
        var common = this.tool.addFolder('Sound');
        common.open();
        common.add(this, '_playSound').name('Play Sound');
        common.add(this, '_pauseSound').name('Pause Sound');
        common.add(this, '_stopSound').name('Stop Sound');
        this._volume = sound.getVolume();
        this._playbackRate = sound['_playbackRate'];
        this._rolloffFactor = sound.rolloffFactor;
        common.add(this, '_volume').min(0.0).max(1.0).step(0.01).name('Volume').onChange(function (result) { return sound.setVolume(result); });
        common.add(this, '_playbackRate').min(0.0).max(1.0).step(0.01).name('Playback Rate').onChange(function (result) { return sound.setPlaybackRate(result); });
        common.add(this, '_rolloffFactor').min(0.0).max(1.0).step(0.01).name('Rolloff Factor').onChange(function (result) { return sound.updateOptions({ rolloffFactor: result }); });
        common.add(sound, 'loop').name('Loop').onChange(function (result) { return sound.updateOptions({ loop: result }); });
        // Spatial
        if (sound.spatialSound) {
            var spatial = this.tool.addFolder('Spatial');
            spatial.open();
            spatial.add(sound, 'distanceModel', ['linear', 'exponential', 'inverse']).name('Distance Model').onFinishChange(function (result) { return sound.updateOptions({ distanceModel: result }); });
            spatial.add(sound, 'maxDistance').min(0.0).name('Max Distance').onChange(function (result) { return sound.updateOptions({ maxDistance: result }); });
            this._position = sound['_position'];
            this.tool.addVector(spatial, 'Position', this._position, function () { return sound.setPosition(_this._position); }).open();
            spatial.add(this, '_attachToMesh').name('Attach to mesh...');
        }
    };
    // Pause sound
    SoundTool.prototype._pauseSound = function () {
        this.object.pause();
    };
    // Play sound
    SoundTool.prototype._playSound = function () {
        this.object.play();
    };
    // Stop sound
    SoundTool.prototype._stopSound = function () {
        this.object.stop();
    };
    // Attaches the sound to given mesh
    SoundTool.prototype._attachToMesh = function () {
        var _this = this;
        var picker = new picker_1.default('Select mesh to attach');
        picker.addItems(this.editor.core.scene.meshes);
        if (this.object['_connectedMesh'])
            picker.addSelected([this.object['_connectedMesh']]);
        picker.open(function (items) {
            if (items.length === 0) {
                _this.object.detachFromMesh();
                _this.editor.graph.setParent(_this.object.name, _this.editor.graph.root);
            }
            else {
                var mesh = _this.editor.core.scene.getMeshByName(items[0].name);
                if (mesh) {
                    _this.object.attachToMesh(mesh);
                    _this.editor.graph.setParent(_this.object.name, mesh.id);
                }
            }
        });
    };
    return SoundTool;
}(edition_tool_1.default));
exports.default = SoundTool;
//# sourceMappingURL=sound-tool.js.map