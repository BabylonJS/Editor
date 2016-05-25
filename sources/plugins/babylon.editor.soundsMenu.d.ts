declare module BABYLON.EDITOR {
    class SoundsMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _addSoundtrackID;
        private _add3DSoundId;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
        private _configureSound(sound);
        private _createInput(callback);
        private _onReadFileCallback(name, callback);
    }
}
