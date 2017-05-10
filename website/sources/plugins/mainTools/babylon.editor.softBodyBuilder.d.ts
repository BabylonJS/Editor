declare module BABYLON.EDITOR {
    class SoftBodyBuilder implements ITabApplication, IEventReceiver {
        private _core;
        private _engine;
        private _scene;
        private _camera;
        private _light;
        private _sphere;
        private _plane;
        private _selectedMesh;
        private _baseMesh;
        private _containerElement;
        private _containerID;
        private _tab;
        private _layouts;
        private _toolbar;
        private _editTool;
        private _extension;
        private _selectedMetadata;
        private _useFreeFallSphere;
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
        private _previewMesh();
        private _configureMesh(mesh);
        private _drawSpheres(draw);
        private _createUI();
        private _buildEditionTool();
        private _createDefaultMetadata();
        private _getMetadatas();
        private _storeMetadatas();
    }
}
