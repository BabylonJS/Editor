declare module BABYLON.EDITOR {
    class SceneHelpers implements ICustomUpdate {
        core: EditorCore;
        private _scene;
        private _helperPlane;
        private _planeMaterial;
        private _subMesh;
        private _batch;
        private _cameraTexture;
        private _soundTexture;
        private _lightTexture;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createHelpers(core: EditorCore): void;
        onPreUpdate(): void;
        onPostUpdate(): void;
        getScene(): Scene;
        private _renderHelperPlane(array, onConfigure);
    }
}
