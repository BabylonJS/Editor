declare module BABYLON.EDITOR {
    class GUITextureEditor {
        object: Object;
        propertyPath: string;
        private _core;
        private _targetObject;
        private _targetTexture;
        private _objectName;
        private _texturesList;
        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, objectName: string, object?: Object, propertyPath?: string);
        private _createUI();
        private _onReadFileCallback(name);
    }
}
