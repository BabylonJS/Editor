declare module BABYLON.EDITOR {
    class Exporter {
        core: EditorCore;
        private _window;
        private _editor;
        private _editorID;
        private _generatedCode;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        openSceneExporter(): void;
        private _generateCode();
        private _exportNodeTransform(node);
        private _exportNodeMaterial(node);
        private _exportVector2(vector);
        private _exportVector3(vector);
        private _exportQuaternion(quaternion);
        private _exportColor3(color);
        private _exportColor4(color);
        private _traverseNodes(node?);
        private _fillRootNodes(data, propertyPath);
    }
}
