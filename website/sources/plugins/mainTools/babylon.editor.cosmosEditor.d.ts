declare module BABYLON.EDITOR {
    class CosmosEditor implements ITabApplication {
        private _core;
        private _engine;
        private _scene;
        private _camera;
        private _light;
        private _skybox;
        private _containerElement;
        private _containerID;
        private _tab;
        private _layouts;
        private _editor;
        private _extension;
        private _dummyIdSearch;
        static _ConfigurationFileContent: string;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        /**
        * Disposes the application
        */
        dispose(): void;
        private _createUI();
        private _reset();
    }
}
