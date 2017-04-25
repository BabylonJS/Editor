var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Scene2dMenuPlugin = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function Scene2dMenuPlugin(mainToolbar) {
                // Public members
                this.menuID = "MAIN-2D-ADD";
                this._addContainer2d = "ADD-CONTAINER-2D";
                this._addSprite2d = "ADD-SPRITE-2D";
                this._addClip2d = "ADD-CLIP-2D";
                var toolbar = mainToolbar.toolbar;
                this._core = mainToolbar.core;
                // Create menu
                var menu = toolbar.createMenu("menu", this.menuID, "2D", "icon-plane");
                // Create items
                toolbar.createMenuItem(menu, "button", this._addContainer2d, "Add Container", "icon-plane");
                toolbar.createMenuItem(menu, "button", this._addSprite2d, "Add Sprite", "icon-plane");
                toolbar.createMenuItem(menu, "button", this._addClip2d, "Add Clip", "icon-plane");
            }
            // When an item has been selected
            Scene2dMenuPlugin.prototype.onMenuItemSelected = function (selected) {
                switch (selected) {
                    case this._addContainer2d:
                        EDITOR.SceneFactory2D.AddContainer2D(this._core);
                        break;
                    case this._addSprite2d:
                        EDITOR.SceneFactory2D.AddSprite2D(this._core);
                        break;
                    case this._addClip2d:
                        EDITOR.SceneFactory2D.AddClip2D(this._core);
                        break;
                }
            };
            // Configure the sound
            Scene2dMenuPlugin.prototype._configureSound = function (sound) {
                BABYLON.Tags.EnableFor(sound);
                BABYLON.Tags.AddTagsTo(sound, "added");
            };
            return Scene2dMenuPlugin;
        }());
        EDITOR.Scene2dMenuPlugin = Scene2dMenuPlugin;
        // Register plugin
        EDITOR.PluginManager.RegisterMainToolbarPlugin(Scene2dMenuPlugin);
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.scene2dMenu.js.map
