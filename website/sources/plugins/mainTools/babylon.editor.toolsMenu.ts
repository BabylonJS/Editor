module BABYLON.EDITOR {
    export class ToolsMenu implements ICustomToolbarMenu {
        // Public members
        public menuID = "TOOLS-PLUGIN-MENU";

        // Private members
        private _core: EditorCore;

        private _openActionsBuilder = "OPEN-ACTIONS-BUILDER";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;
            this._core = mainToolbar.core;

            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Tools", "icon-scenario");

            // Create items
            toolbar.createMenuItem(menu, "button", this._openActionsBuilder, "Open Actions Builder", "icon-graph");

            // Test
            ActionsBuilder.GetInstance(this._core);

        }
        
        // Called when a menu item is selected by the user
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                case this._openActionsBuilder: ActionsBuilder.GetInstance(this._core); break;
                default: break;
            }
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterMainToolbarPlugin(ToolsMenu);
}