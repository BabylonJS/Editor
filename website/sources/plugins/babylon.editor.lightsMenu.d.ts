declare module BABYLON.EDITOR {
    class LightsMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _addPointLight;
        private _addDirectionalLight;
        private _addSpotLight;
        private _addHemisphericLight;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
        private _configureSound(sound);
    }
}
