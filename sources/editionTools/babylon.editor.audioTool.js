var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AudioTool = (function (_super) {
            __extends(AudioTool, _super);
            function AudioTool(editionTool) {
                _super.call(this, editionTool);
                this.tab = "SOUND.TAB";
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-SOUND"
                ];
            }
            AudioTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Sound)
                    return true;
                return false;
            };
            AudioTool.prototype.createUI = function () {
                this._editionTool.panel.createTab({ id: this.tab, caption: "Sound" });
            };
            AudioTool.prototype.update = function () {
                var sound = this.object = this._editionTool.object;
                var soundTrack = this._editionTool.core.currentScene.soundTracks[sound.soundTrackId];
                _super.prototype.update.call(this);
                if (!sound)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(sound);
                var soundFolder = this._element.addFolder("Sound");
                soundFolder.add(this, "_playSound").name("Play Sound");
                soundFolder.add(this, "_pauseSound").name("Pause Sound");
                soundFolder.add(this, "_stopSound").name("Stop Sound");
                this._volume = sound.getVolume();
                this._playbackRate = sound._playbackRate;
                soundFolder.add(this, "_volume").min(0.0).max(1.0).step(0.01).name("Volume").onChange(function (result) {
                    sound.setVolume(result);
                });
                soundFolder.add(this, "_playbackRate").min(0.0).max(1.0).step(0.01).name("Playback Rate").onChange(function (result) {
                    sound.setPlaybackRate(result);
                });
                soundFolder.add(sound, "rolloffFactor").min(0.0).max(1.0).step(0.01).name("Rolloff Factor").onChange(function (result) {
                    sound.updateOptions({
                        rolloffFactor: result
                    });
                });
                soundFolder.add(sound, "loop").name("Loop").onChange(function (result) {
                    sound.updateOptions({
                        loop: result
                    });
                });
                soundFolder.add(sound, "distanceModel", ["linear", "exponential", "inverse"]).name("Distance Model").onFinishChange(function (result) {
                    sound.updateOptions({
                        distanceModel: result
                    });
                });
                if (sound.spatialSound) {
                    soundFolder.add(sound, "maxDistance").min(0.0).name("Max Distance").onChange(function (result) {
                        sound.updateOptions({
                            maxDistance: result
                        });
                    });
                }
                sound.distanceModel;
                this._position = sound._position;
                var positionFolder = soundFolder.addFolder("Position");
                positionFolder.open();
                positionFolder.add(this._position, "x").step(0.1).onChange(this._positionCallback(sound)).listen();
                positionFolder.add(this._position, "y").step(0.1).onChange(this._positionCallback(sound)).listen();
                positionFolder.add(this._position, "z").step(0.1).onChange(this._positionCallback(sound)).listen();
                var soundTrackFolder = this._element.addFolder("Sound Track");
                return true;
            };
            AudioTool.prototype._positionCallback = function (sound) {
                var _this = this;
                return function (result) {
                    sound.setPosition(_this._position);
                };
            };
            AudioTool.prototype._pauseSound = function () {
                var sound = this.object;
                sound.pause();
            };
            AudioTool.prototype._playSound = function () {
                var sound = this.object;
                sound.play();
            };
            AudioTool.prototype._stopSound = function () {
                var sound = this.object;
                sound.stop();
            };
            return AudioTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AudioTool = AudioTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
