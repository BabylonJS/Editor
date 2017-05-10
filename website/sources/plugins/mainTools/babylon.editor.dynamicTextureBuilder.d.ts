declare module BABYLON.EDITOR {
    class DynamicTextureBuilder implements ITabApplication {
        private _core;
        private _containerElement;
        private _containerID;
        private _tab;
        private _layouts;
        private _editForm;
        private _extension;
        private _currentMetadatas;
        private _currentMetadata;
        private _engine;
        private _scene;
        private _camera;
        private _ground;
        private _material;
        private _currentTexture;
        private _textureObject?;
        private _sceneTextureObject?;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        /**
        * Disposes the application
        */
        dispose(): void;
        private _createEditForm();
        private _onDynamicTextureChange(scene?);
        private _createTextureInMainScene(storeMetadatas?);
        private _createNewDynamicTexture(setAsNew?);
        private _removeDynamicTexture();
        private _getMetadatas();
        private _getMainSceneTexture(name);
        private _storeMetadatas();
        private _createScene();
        private _createUI();
    }
}
