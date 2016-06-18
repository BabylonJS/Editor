var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SoundsMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function SoundsMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "SOUNDS-MENU";
                this._addSoundtrack = "ADD-SOUNDTRACK";
                this._add3DSound = "ADD-3D-SOUND";
                this._stopAllSounds = "STOP-ALL-SOUNDS";
                this._playAllSounds = "PLAY-ALL-SOUNDS";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Sound", "icon-sound");
                // Create items
                toolbar.createMenuItem(menu, "button", this._addSoundtrack, "Add Soundtracks", "icon-sound");
                toolbar.createMenuItem(menu, "button", this._add3DSound, "Add 3D Sound", "icon-sound");
                toolbar.addBreak(menu);
                toolbar.createMenuItem(menu, "button", this._stopAllSounds, "Stop All Sounds", "icon-stop-sound");
                toolbar.createMenuItem(menu, "button", this._playAllSounds, "Play All Sounds", "icon-play-sound");
                // Etc.
            }
            // When an item has been selected
            SoundsMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                var _this = this;
                // Switch selected menu id
                switch (selected) {
                    case this._addSoundtrack:
                    case this._add3DSound:
                        this._createInput(function (name, data) {
                            var options = {
                                autoplay: false,
                                spatialSound: selected === _this._add3DSound
                            };
                            var sound = new BABYLON.Sound(name, data, _this._core.currentScene, null, options);
                            EDITOR.Event.sendSceneEvent(sound, EDITOR.SceneEventType.OBJECT_ADDED, _this._core);
                            _this._configureSound(sound);
                        });
                        break;
                    case this._stopAllSounds:
                        this._stopPlayAllSounds(false);
                        break;
                    case this._playAllSounds:
                        this._stopPlayAllSounds(true);
                        break;
                    default: break;
                }
            };
            // Stop or play all sounds
            SoundsMenuPlugin.prototype._stopPlayAllSounds = function (play) {
                var soundtrack = this._core.currentScene.mainSoundTrack;
                for (var i = 0; i < soundtrack.soundCollection.length; i++) {
                    var sound = soundtrack.soundCollection[i];
                    if (play && !sound.isPlaying)
                        sound.play();
                    else
                        sound.stop();
                }
            };
            // Configure the sound
            SoundsMenuPlugin.prototype._configureSound = function (sound) {
                BABYLON.Tags.EnableFor(sound);
                BABYLON.Tags.AddTagsTo(sound, "added");
            };
            // Creates an input to select file
            SoundsMenuPlugin.prototype._createInput = function (callback) {
                var _this = this;
                var inputFiles = EDITOR.Tools.CreateFileInpuElement("BABYLON-EDITOR-LOAD-SOUND-FILE");
                inputFiles[0].onchange = function (data) {
                    for (var i = 0; i < data.target.files.length; i++) {
                        var file = data.target.files[i];
                        switch (file.type) {
                            case "image/targa":
                            case "image/vnd.ms-dds":
                            case "audio/wav":
                            case "audio/x-wav":
                            case "audio/mp3":
                            case "audio/mpeg":
                            case "audio/mpeg3":
                            case "audio/x-mpeg-3":
                            case "audio/ogg":
                                BABYLON.Tools.ReadFile(file, _this._onReadFileCallback(file.name, callback), null, true);
                                BABYLON.FilesInput.FilesToLoad[name.toLowerCase()] = file;
                                break;
                        }
                    }
                    inputFiles.remove();
                };
                inputFiles.click();
            };
            // On read file callback
            SoundsMenuPlugin.prototype._onReadFileCallback = function (name, callback) {
                return function (data) {
                    callback(name, data);
                };
            };
            return SoundsMenuPlugin;
        }());
        EDITOR.SoundsMenuPlugin = SoundsMenuPlugin;
        // Register plugin
        EDITOR.PluginManager.RegisterMainToolbarPlugin(SoundsMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
