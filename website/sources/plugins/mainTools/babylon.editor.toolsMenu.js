var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsMenu = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ToolsMenu(mainToolbar) {
                // Public members
                this.menuID = "TOOLS-PLUGIN-MENU";
                this._openActionsBuilder = "OPEN-ACTIONS-BUILDER";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Tools", "icon-scenario");
                // Create items
                toolbar.createMenuItem(menu, "button", this._openActionsBuilder, "Open Actions Builder", "icon-graph");
                // Test
                EDITOR.ActionsBuilder.GetInstance(this._core);
            }
            // Called when a menu item is selected by the user
            ToolsMenu.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._openActionsBuilder:
                        EDITOR.ActionsBuilder.GetInstance(this._core);
                        break;
                    default: break;
                }
            };
            return ToolsMenu;
        }());
        EDITOR.ToolsMenu = ToolsMenu;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(ToolsMenu);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
