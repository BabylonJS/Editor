var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ElectronMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "ELECTRON-MENU";
                this._connectPhotoshop = "CONNECT-PHOTOSHOP";
                this._disconnectPhotoshop = "DISCONNECT-PHOTOSHOP";
                this._watchSceneFile = "WATCH-SCENE-FILE";
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
            ElectronMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._connectPhotoshop:
                        EDITOR.ElectronPhotoshopPlugin.Connect(this._core);
                        break;
                    case this._disconnectPhotoshop:
                        EDITOR.ElectronPhotoshopPlugin.Disconnect();
                        break;
                    case this._watchSceneFile:
                        var checked = !this._toolbar.isItemChecked(this._watchSceneFile, this.menuID);
                        EDITOR.ElectronHelper.ReloadSceneOnFileChanged = checked;
                        this._toolbar.setItemChecked(this._watchSceneFile, checked, this.menuID);
                        this._toolbar.setItemText(this._watchSceneFile, checked ? "Disable automatic scene reload" : "Automatically reload scene", this.menuID);
                        break;
                    default: break;
                }
            };
            return ElectronMenuPlugin;
        }());
        EDITOR.ElectronMenuPlugin = ElectronMenuPlugin;
        // Register plugin
        if (EDITOR.Tools.CheckIfElectron())
            EDITOR.PluginManager.RegisterMainToolbarPlugin(ElectronMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
