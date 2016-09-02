var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ScenarioMakerMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ScenarioMakerMenuPlugin(mainToolbar) {
                var _this = this;
                // Public members
                this.menuID = "SCENARIO-MAKER-MENU";
                this._openScenarioMaker = "OPEN-SCENARIO-MAKER";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Scenario Maker", "icon-console");
                // Create items
                toolbar.createMenuItem(menu, "button", this._openScenarioMaker, "Open Scenario Maker", "icon-play");
                // Load file
                BABYLON.Tools.LoadFile("website/resources/babylon.d.txt", function (data) { return _this._parseFile(data); }, null, null, false);
            }
            // Called when a menu item is selected by the user
            ScenarioMakerMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    default: break;
                }
            };
            /**
            * Parses the babylon file
            */
            ScenarioMakerMenuPlugin.prototype._parseFile = function (data) {
                var tokenizer = new EDITOR.Tokenizer(data);
                tokenizer.parseString();
            };
            return ScenarioMakerMenuPlugin;
        }());
        EDITOR.ScenarioMakerMenuPlugin = ScenarioMakerMenuPlugin;
        // Finally, register the plugin using the plugin manager
        EDITOR.PluginManager.RegisterMainToolbarPlugin(ScenarioMakerMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
