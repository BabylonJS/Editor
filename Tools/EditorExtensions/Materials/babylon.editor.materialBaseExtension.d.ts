declare module BABYLON.EDITOR.EXTENSIONS {
    interface IMaterialBuilderUniform {
        name: string;
        value: number | number[];
        _cachedValue?: number | Vector2 | Vector3 | Vector4;
    }
    interface IMaterialBuilderSampler {
        textureName: string;
        uniformName: string;
        object?: BaseTexture;
        serializedObject?: any;
    }
    interface IMaterialBuilderSettings {
        samplers: IMaterialBuilderSampler[];
        uniforms: IMaterialBuilderUniform[];
        time: boolean;
    }
    class MaterialBuilder extends PushMaterial {
        diffuseColor: Color3;
        useLogarithmicDepth: boolean;
        private _disableLighting;
        disableLighting: boolean;
        private _maxSimultaneousLights;
        maxSimultaneousLights: number;
        private _useLogarithmicDepth;
        settings: IMaterialBuilderSettings;
        _data: IMaterialExtensionData;
        private _renderId;
        private _mesh;
        private _currentTime;
        constructor(name: string, scene: Scene, settings?: IMaterialBuilderSettings);
        needAlphaBlending(): boolean;
        needAlphaTesting(): boolean;
        getAlphaTestTexture(): BaseTexture;
        isReadyForSubMesh(mesh: AbstractMesh, subMesh: SubMesh, useInstances?: boolean): boolean;
        bindForSubMesh(world: Matrix, mesh: Mesh, subMesh: SubMesh): void;
        getAnimatables(): IAnimatable[];
        dispose(forceDisposeEffect?: boolean): void;
        clone(name: string): MaterialBuilder;
        serialize(): any;
        setupCachedValues(): void;
        static Parse(source: any, scene: Scene, rootUrl: string): MaterialBuilder;
    }
}
