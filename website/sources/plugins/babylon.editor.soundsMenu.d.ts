declare module BABYLON.EDITOR {
    class SoundsMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _addSoundtrack;
        private _add3DSound;
        private _stopAllSounds;
        private _playAllSounds;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
        private _stopPlayAllSounds(play);
        private _configureSound(sound);
        private _createInput(callback);
        private _onReadFileCallback(name, callback);
    }
}
