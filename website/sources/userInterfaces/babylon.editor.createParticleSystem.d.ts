declare module BABYLON.EDITOR {
    class GUICreateParticleSystem implements IEventReceiver {
        core: EditorCore;
        private _window;
        private _layouts;
        private _leftPanel;
        private _layoutID;
        private _formTabID;
        private _editorTabID;
        private _editElement;
        private _editElementID;
        private _inputElementID;
        private _editor;
        private _editorElementID;
        private _engine;
        private _scene;
        private _camera;
        private _particleSystem;
        private _particleSystemToEdit;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, particleSystem?: ParticleSystem, createUI?: boolean);
        onEvent(event: Event): boolean;
        private _createUI();
        _createEditor(container?: string): GUI.GUIEditForm;
        private _setParticleSystem();
        private _setParticleTexture();
        static CreateParticleSystem(scene: Scene, capacity: number, particleSystem?: ParticleSystem, emitter?: Node): ParticleSystem;
    }
}
