declare module BABYLON.EDITOR {
    class GeometriesMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _createCubeID;
        private _createSphereID;
        /**
        * Constructor
        * @param toolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        /**
        * Called when a menu item is selected by the user
        * Returns true if a menu of the plugin was selected, false if no one selected
        */
        onMenuItemSelected(selected: string): void;
    }
}
