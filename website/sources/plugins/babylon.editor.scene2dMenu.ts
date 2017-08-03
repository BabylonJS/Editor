module BABYLON.EDITOR {
    export class Scene2dMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "MAIN-2D-ADD";

        // Private members
        private _core: EditorCore;

        private _addContainer2d: string = "ADD-CONTAINER-2D";
        private _addSprite2d: string = "ADD-SPRITE-2D";
        private _addClip2d: string = "ADD-CLIP-2D";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
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
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                case this._addContainer2d:
                    SceneFactory2D.AddContainer2D(this._core);
                    break;
                case this._addSprite2d:
                    SceneFactory2D.AddSprite2D(this._core);
                    break;
                case this._addClip2d:
                    SceneFactory2D.AddClip2D(this._core);
                    break;
            }
        }

        // Configure the sound
        private _configureSound(sound: Sound): void {
            Tags.EnableFor(sound);
            Tags.AddTagsTo(sound, "added");
        }
    }

    // Register plugin
    //PluginManager.RegisterMainToolbarPlugin(Scene2dMenuPlugin);
}