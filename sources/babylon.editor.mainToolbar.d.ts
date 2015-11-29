declare module BABYLON.EDITOR {
    class MainToolbar implements ICustomUpdate, IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _mainAdd;
        private _addPointLight;
        private _addDirectionalLight;
        private _addSpotLight;
        private _addHemisphericLight;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        createUI(): void;
    }
}
