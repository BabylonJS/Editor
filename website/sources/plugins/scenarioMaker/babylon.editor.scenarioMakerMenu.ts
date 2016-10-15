module BABYLON.EDITOR {
    export class ScenarioMakerMenu implements ICustomToolbarMenu {
        // Public members
        public menuID = "SCENARIO-MAKER-MENU";

        // Private members
        private _core: EditorCore;

        private _openActionsBuilder = "OPEN-SCENARIO-MAKER";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;
            this._core = mainToolbar.core;

            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Scenario Maker", "icon-scenario");

            // Create items
            toolbar.createMenuItem(menu, "button", this._openActionsBuilder, "Open Actions Builder", "icon-play-game");

            // Test
            // new ActionsBuilder(this._core);

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
    PluginManager.RegisterMainToolbarPlugin(ScenarioMakerMenu);
}