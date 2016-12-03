var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LightsMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function LightsMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "LIGHTS-MENU";
                this._addPointLight = "ADD-POINT-LIGHT";
                this._addDirectionalLight = "ADD-DIRECTIONAL-LIGHT";
                this._addSpotLight = "ADD-SPOT-LIGHT";
                this._addHemisphericLight = "ADD-HEMISPHERIC-LIGHT";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "Lights", "icon-light");
                // Create items
                toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
                toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
                toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
                toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
            }
            // When an item has been selected
            LightsMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._addPointLight:
                        EDITOR.SceneFactory.AddPointLight(this._core);
                        break;
                    case this._addDirectionalLight:
                        EDITOR.SceneFactory.AddDirectionalLight(this._core);
                        break;
                    case this._addSpotLight:
                        EDITOR.SceneFactory.AddSpotLight(this._core);
                        break;
                    case this._addHemisphericLight:
                        EDITOR.SceneFactory.AddHemisphericLight(this._core);
                        break;
                }
            };
            // Configure the sound
            LightsMenuPlugin.prototype._configureSound = function (sound) {
                BABYLON.Tags.EnableFor(sound);
                BABYLON.Tags.AddTagsTo(sound, "added");
            };
            return LightsMenuPlugin;
        }());
        EDITOR.LightsMenuPlugin = LightsMenuPlugin;
        // Register plugin
        EDITOR.PluginManager.RegisterMainToolbarPlugin(LightsMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.lightsMenu.js.map
