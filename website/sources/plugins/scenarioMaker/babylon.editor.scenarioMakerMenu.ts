module BABYLON.EDITOR {
    export class ScenarioMakerMenu implements ICustomToolbarMenu {
        // Public members
        public menuID = "SCENARIO-MAKER-MENU";

        // Private members
        private _core: EditorCore;

        private _openScenarioMaker = "OPEN-SCENARIO-MAKER";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
            var toolbar = mainToolbar.toolbar;
            this._core = mainToolbar.core;

            // Create menu
            var menu = toolbar.createMenu("menu", this.menuID, "Scenario Maker", "icon-console");

            // Create items
            toolbar.createMenuItem(menu, "button", this._openScenarioMaker, "Open Scenario Maker", "icon-play");

            // Test
            var t = new ActionsBuilder(this._core);

        }
        
        // Called when a menu item is selected by the user
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                default: break;
            }
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterMainToolbarPlugin(ScenarioMakerMenu);
}