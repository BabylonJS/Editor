declare module BABYLON.EDITOR {
    interface IEnabledPostProcesses {
        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;
        standard: boolean;
        attachStandard: boolean;
        vls: boolean;
    }
    class SceneFactory {
        static GenerateUUID(): string;
        static readonly DummyNodeID: string;
        static ConfigureObject(object: any, core: EditorCore): void;
        static HDRPipeline: HDRRenderingPipeline;
        static StandardPipeline: StandardRenderingPipeline;
        static SSAOPipeline: SSAORenderingPipeline;
        static VLSPostProcess: VolumetricLightScatteringPostProcess;
        static EnabledPostProcesses: IEnabledPostProcesses;
        static NodesToStart: IAnimatable[];
        static AnimationSpeed: number;
        /**
        * Post-Processes
        */
        static CreateStandardRenderingPipeline(core: EditorCore, callback?: () => void): StandardRenderingPipeline;
        static CreateSSAOPipeline(core: EditorCore, serializationObject?: any): SSAORenderingPipeline;
        static CreateVLSPostProcess(core: EditorCore, mesh?: Mesh, serializationObject?: any): VolumetricLightScatteringPostProcess;
        /**
        * Nodes
        */
        static AddPointLight(core: EditorCore): PointLight;
        static AddDirectionalLight(core: EditorCore): DirectionalLight;
        static AddSpotLight(core: EditorCore): SpotLight;
        static AddHemisphericLight(core: EditorCore): HemisphericLight;
        static AddBoxMesh(core: EditorCore): Mesh;
        static AddSphereMesh(core: EditorCore): Mesh;
        static AddCylinderMesh(core: EditorCore): Mesh;
        static AddPlaneMesh(core: EditorCore): Mesh;
        static AddGroundMesh(core: EditorCore): Mesh;
        static AddHeightMap(core: EditorCore): Mesh;
        static AddParticleSystem(core: EditorCore, chooseEmitter?: boolean): void;
        static AddLensFlareSystem(core: EditorCore, chooseEmitter?: boolean, emitter?: any): void;
        static AddLensFlare(core: EditorCore, system: LensFlareSystem, size: number, position: number, color: any): LensFlare;
        static AddReflectionProbe(core: EditorCore): ReflectionProbe;
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture;
        static AddMirrorTexture(core: EditorCore): MirrorTexture;
        static AddSkyMesh(core: EditorCore): Mesh;
        static AddWaterMesh(core: EditorCore): Mesh;
        static AddInstancedMesh(core: EditorCore, mesh: Mesh): InstancedMesh;
    }
}
