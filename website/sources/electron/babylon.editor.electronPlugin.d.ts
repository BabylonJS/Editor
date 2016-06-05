declare module BABYLON.EDITOR {
    class ElectronMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _toolbar;
        private _connectPhotoshop;
        private _disconnectPhotoshop;
        private _watchSceneFile;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
    }
}
