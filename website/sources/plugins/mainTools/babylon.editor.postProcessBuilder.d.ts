declare module BABYLON.EDITOR {
    class PostProcessBuilder implements ITabApplication, IEventReceiver {
        private _core;
        private _engine;
        private _scene;
        private _camera;
        private _texture;
        private _scenePassPostProcess;
        private _containerElement;
        private _containerID;
        private _tab;
        private _layouts;
        private _postProcessesList;
        private _selectTemplateWindow;
        private _editor;
        private _console;
        private _datas;
        private _currentSelected;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        /**
        * Disposes the application
        */
        dispose(): void;
        /**
        * On event
        */
        onEvent(event: Event): boolean;
        private _createUI();
        private _onPostProcessSelected(selected);
        private _onPostProcessAdd();
        private _onPostProcessRemove(selected);
        private _onPostProcessEditField(recid, value);
        private _onEditorChanged();
        private _onApplyPostProcessChain(applyOnScene);
        private _removePostProcess(postProcess, applyOnScene?);
        private _postProcessCallback(postProcess, applyOnScene?);
        private _storeMetadatas();
    }
}
