module BABYLON.EDITOR {
    export class LightsMenuPlugin implements ICustomToolbarMenu {
        // Public members
        public menuID = "LIGHTS-MENU";

        // Private members
        private _core: EditorCore;

        private _addPointLight: string = "ADD-POINT-LIGHT";
        private _addDirectionalLight: string = "ADD-DIRECTIONAL-LIGHT";
        private _addSpotLight: string = "ADD-SPOT-LIGHT";
        private _addHemisphericLight: string = "ADD-HEMISPHERIC-LIGHT";

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar) {
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
        public onMenuItemSelected(selected: string): void {
            switch (selected) {
                case this._addPointLight:
                    SceneFactory.AddPointLight(this._core);
                    break;
                case this._addDirectionalLight:
                    SceneFactory.AddDirectionalLight(this._core);
                    break;
                case this._addSpotLight:
                    SceneFactory.AddSpotLight(this._core);
                    break;
                case this._addHemisphericLight:
                    SceneFactory.AddHemisphericLight(this._core);
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
    PluginManager.RegisterMainToolbarPlugin(LightsMenuPlugin);
}