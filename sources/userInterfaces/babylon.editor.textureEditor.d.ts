declare module BABYLON.EDITOR {
    class GUITextureEditor implements IEventReceiver {
        object: Object;
        propertyPath: string;
        private _core;
        private _targetObject;
        private _targetTexture;
        private _objectName;
        private _currentRenderTarget;
        private _currentPixels;
        private _currentOnAfterRender;
        private _dynamicTexture;
        private _texturesList;
        private _engine;
        private _scene;
        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, objectName?: string, object?: Object, propertyPath?: string);
        onEvent(ev: Event): boolean;
        private _createUI();
        private _configureRenderTarget();
        private _restorRenderTarget();
        private _fillTextureList();
        private _onReadFileCallback(name);
    }
}
