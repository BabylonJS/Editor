module BABYLON.EDITOR {
    export class ElectronMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "ELECTRON-MENU";

        // Private members
        private _core: EditorCore;
        private _toolbar: GUI.GUIToolbar;

        private _connectPhotoshop: string = "CONNECT-PHOTOSHOP";
        private _disconnectPhotoshop: string = "DISCONNECT-PHOTOSHOP";

        private _watchSceneFile: string = "WATCH-SCENE-FILE";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;

            this._core = mainToolbar.core;
            this._toolbar = toolbar;
            
            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Electron", "icon-electron");

            // Create items
            toolbar.createMenuItem(menu, "button", this._connectPhotoshop, "Connect to Photoshop...", "icon-photoshop-connect");
            toolbar.createMenuItem(menu, "button", this._disconnectPhotoshop, "Disconnect Photoshop...", "icon-photoshop-disconnect");
            toolbar.addBreak(menu);
            toolbar.createMenuItem(menu, "button", this._watchSceneFile, "Automatically reload scene", "icon-helpers", false);
        }
        
        // When an item has been selected
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                case this._connectPhotoshop:
                    ElectronPhotoshopPlugin.Connect(this._core);
                    break;
                case this._disconnectPhotoshop:
                    ElectronPhotoshopPlugin.Disconnect();
                    break;
                case this._watchSceneFile:
                    var checked = !this._toolbar.isItemChecked(this._watchSceneFile, this.menuID);
                    ElectronHelper.ReloadSceneOnFileChanged = checked;
                    this._toolbar.setItemChecked(this._watchSceneFile, checked, this.menuID);
                    this._toolbar.setItemText(this._watchSceneFile, checked ? "Disable automatic scene reload" : "Automatically reload scene", this.menuID);
                    break;
                default: break;
            }
        }
    }

    // Register plugin
    if (Tools.CheckIfElectron())
        PluginManager.RegisterMainToolbarPlugin(ElectronMenuPlugin);
}