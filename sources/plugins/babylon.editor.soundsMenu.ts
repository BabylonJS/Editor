module BABYLON.EDITOR {
    export class SoundsMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "SOUNDS-MENU";

        // Private members
        private _core: EditorCore;

        private _addSoundtrackID = "ADD-SOUNDTRACK";
        private _add3DSoundId = "ADD-3D-SOUND";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;
            this._core = mainToolbar.core;

            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Sound", "icon-sound");
            
            // Create items
            toolbar.createMenuItem(menu, "button", this._addSoundtrackID, "Add Soundtracks", "icon-sound");
            toolbar.createMenuItem(menu, "button", this._add3DSoundId, "Add 3D Sounds", "icon-sound");
            // Etc.
        }
        
        // When an item has been selected
        public onMenuItemSelected(selected: string): void {
            // Switch selected menu id
            switch (selected) {
                case this._addSoundtrackID:
                    this._createInput((name: string, data: ArrayBuffer) => {
                        var sound = new Sound(name, data, this._core.currentScene);
                        Event.sendSceneEvent(sound, SceneEventType.OBJECT_ADDED, this._core);
                        this._configureSound(sound);
                    });
                    break;
                case this._add3DSoundId:
                    SceneFactory.AddSphereMesh(this._core);
                    break;
                default: break;
            }
        }
        
        // Configure the sound
        private _configureSound(sound: Sound): void {
            Tags.EnableFor(sound);
            Tags.AddTagsTo(sound, "added");
        }
        
        // Creates an input to select file
        private _createInput(callback: (name: string, data: ArrayBuffer) => void) {
            var inputFiles = Tools.CreateFileInpuElement("BABYLON-EDITOR-LOAD-SOUND-FILE");
            
            inputFiles[0].onchange = (data: any) => {
                for (var i = 0; i < data.target.files.length; i++) {
                    var file: File = data.target.files[i];
                    
                    switch(file.type) {
                        case "image/targa":
                        case "image/vnd.ms-dds":
                        case "audio/wav":
                        case "audio/x-wav":
                        case "audio/mp3":
                        case "audio/mpeg":
                        case "audio/mpeg3":
                        case "audio/x-mpeg-3":
                        case "audio/ogg":
                            BABYLON.Tools.ReadFile(file, this._onReadFileCallback(file.name, callback), null, true);
                            BABYLON.FilesInput.FilesToLoad[name.toLowerCase()] = file;
                        break;
                    }
                }
                
                inputFiles.remove();
            };
            
            inputFiles.click();
        }
        
        // On read file callback
        private _onReadFileCallback(name: string, callback: (name: string, data: ArrayBuffer) => void): (data: ArrayBuffer) => void {
            return (data: ArrayBuffer) => {
                callback(name, data);
            };
        }
    }

    // Register plugin
    PluginManager.RegisterMainToolbarPlugin(SoundsMenuPlugin);
}