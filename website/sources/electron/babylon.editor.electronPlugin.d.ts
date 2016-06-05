declare module BABYLON.EDITOR {
    class ElectronMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _connectPhotoshop;
        private _disconnectPhotoshop;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
    }
}
