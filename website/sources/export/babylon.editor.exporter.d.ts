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
        openSceneExporter(babylonScene?: boolean): void;
        generateCode(babylonScene?: boolean): string;
        _exportParticleSystem(particleSystem: ParticleSystem): string;
        _exportVector3(vector: Vector3): string;
        _exportColor3(color: Color3): string;
        _exportColor4(color: Color4): string;
    }
}
