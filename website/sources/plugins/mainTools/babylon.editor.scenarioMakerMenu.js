var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ScenarioMakerMenu = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ScenarioMakerMenu(mainToolbar) {
                // Public members
                this.menuID = "SCENARIO-MAKER-MENU";
                this._openActionsBuilder = "OPEN-SCENARIO-MAKER";
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
            ScenarioMakerMenu.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._openActionsBuilder:
                        EDITOR.ActionsBuilder.GetInstance(this._core);
                        break;
                    default: break;
                }
            };
            return ScenarioMakerMenu;
        }());
        EDITOR.ScenarioMakerMenu = ScenarioMakerMenu;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(ScenarioMakerMenu);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.scenarioMakerMenu.js.map