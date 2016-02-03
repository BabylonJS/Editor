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
        static ExportCode(core: EditorCore): string;
        _exportSceneValues(): string;
        _exportScene(): string;
        _exportReflectionProbes(): string;
        _exportNodeTransform(node: any): string;
        _getTextureByName(name: string, scene: Scene): BaseTexture;
        _exportPostProcesses(): string;
        _exportAnimations(node: IAnimatable): string;
        _exportNodeMaterial(node: AbstractMesh | SubMesh, subMeshId?: number): string;
        _exportSky(node: Node): string;
        _exportParticleSystem(particleSystem: ParticleSystem): string;
        _exportLight(light: Light): string;
        _exportVector2(vector: Vector2): string;
        _exportVector3(vector: Vector3): string;
        _exportQuaternion(quaternion: Quaternion): string;
        _exportColor3(color: Color3): string;
        _exportColor4(color: Color4): string;
        private _traverseNodes(node?);
        private _fillRootNodes(data, propertyPath);
    }
}
