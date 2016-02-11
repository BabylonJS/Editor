declare module BABYLON.EDITOR {
    class GUIParticleSystemEditor implements IEventReceiver {
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
        private _uiCreated;
        private _particleSystemCapacity;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, particleSystem?: ParticleSystem, createUI?: boolean);
        onEvent(event: Event): boolean;
        private _createUI();
        _createEditor(container?: string): GUI.GUIEditForm;
        private _setParticleSystem();
        private _editParticleSystem();
        private _startParticleSystem();
        private _stopParticleSystem();
        private _updateGraphNode(result, data?);
        static _CurrentParticleSystem: ParticleSystem;
        static _CopiedParticleSystem: ParticleSystem;
        private _setParticleTexture();
        static PlayStopAllParticleSystems(scene: Scene, play: boolean): void;
        static CreateParticleSystem(scene: Scene, capacity: number, particleSystem?: ParticleSystem, emitter?: Node): ParticleSystem;
    }
}
