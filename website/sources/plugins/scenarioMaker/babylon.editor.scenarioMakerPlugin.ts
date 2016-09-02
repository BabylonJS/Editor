module BABYLON.EDITOR {
    export class ScenarioMakerMenuPlugin implements ICustomToolbarMenu {
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

            // Load file
            BABYLON.Tools.LoadFile("website/resources/babylon.d.txt", (data: any) => this._parseFile(data), null, null, false);
        }
        
        // Called when a menu item is selected by the user
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                default: break;
            }
        }

        /**
        * Parses the babylon file
        */
        private _parseFile(data: string): void {
            var tokenizer = new Tokenizer(data);
            tokenizer.parseString();
        }
    }

    // Finally, register the plugin using the plugin manager
    PluginManager.RegisterMainToolbarPlugin(ScenarioMakerMenuPlugin);
}