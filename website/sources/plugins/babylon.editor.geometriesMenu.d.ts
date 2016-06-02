declare module BABYLON.EDITOR {
    class GeometriesMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _createCubeID;
        private _createSphereID;
        private _createGroundID;
        private _createHeightMap;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        /**
        * Called when a menu item is selected by the user
        * "selected" is the id of the selected item
        */
        onMenuItemSelected(selected: string): void;
    }
}
