declare module BABYLON.EDITOR {
    class MainToolbar implements ICustomUpdate, IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _mainProject;
        private _projectExportCode;
        private _projectConnectStorage;
        private _projectTemplateStorage;
        private _mainEditLaunch;
        private _mainAdd;
        private _addPointLight;
        private _addDirectionalLight;
        private _addSpotLight;
        private _addHemisphericLight;
        private _addParticleSystem;
        private _addSkyMesh;
        private _addReflectionProbe;
        private _addRenderTarget;
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
