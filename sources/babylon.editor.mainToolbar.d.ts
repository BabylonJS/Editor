declare module BABYLON.EDITOR {
    class MainToolbar implements ICustomUpdate, IEventReceiver {
        container: string;
        toolbar: GUI.GUIToolbar;
        panel: GUI.GUIPanel;
        core: EditorCore;
        particleSystemMenu: GUI.IToolbarMenuElement;
        particleSystemCopyItem: GUI.IToolbarElement;
        particleSystemPasteItem: GUI.IToolbarElement;
        private _editor;
        private _plugins;
        private _mainProject;
        private _mainProjectOpenFiles;
        private _mainProjectReload;
        private _projectExportCode;
        private _projectExportBabylonScene;
        private _projectConnectStorage;
        private _projectTemplateStorage;
        private _mainEdit;
        private _mainEditLaunch;
        private _mainEditTextures;
        private _mainAdd;
        private _addPointLight;
        private _addDirectionalLight;
        private _addSpotLight;
        private _addHemisphericLight;
        private _addParticleSystem;
        private _addSkyMesh;
        private _addWaterMesh;
        private _addLensFlare;
        private _addReflectionProbe;
        private _addRenderTarget;
        private _particlesMain;
        private _particlesCopy;
        private _particlesPaste;
        private _particlesPlay;
        private _particlesStop;
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
