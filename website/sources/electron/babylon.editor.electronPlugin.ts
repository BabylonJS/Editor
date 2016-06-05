module BABYLON.EDITOR {
    export class ElectronMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "ELECTRON-MENU";

        // Private members
        private _core: EditorCore;

        private _connectPhotoshop: string = "CONNECT-PHOTOSHOP";
        private _disconnectPhotoshop: string = "DISCONNECT-PHOTOSHOP";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;
            this._core = mainToolbar.core;

            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Electron", "icon-electron");

            // Create items
            toolbar.createMenuItem(menu, "button", this._connectPhotoshop, "Connect to Photoshop...", "icon-photoshop-connect");
            toolbar.createMenuItem(menu, "button", this._disconnectPhotoshop, "Disconnect Photoshop...", "icon-photoshop-disconnect");
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
                default: break;
            }
        }
    }

    // Register plugin
    if (Tools.CheckIfElectron())
        PluginManager.RegisterMainToolbarPlugin(ElectronMenuPlugin);
}