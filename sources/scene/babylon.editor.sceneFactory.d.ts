declare module BABYLON.EDITOR {
    interface IEnabledPostProcesses {
        hdr: boolean;
        attachHDR: boolean;
        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;
        vls: boolean;
    }
    class SceneFactory {
        static GenerateUUID(): string;
        static ConfigureObject(object: any, core: EditorCore): void;
        static HDRPipeline: HDRRenderingPipeline;
        static SSAOPipeline: SSAORenderingPipeline;
        static VLSPostProcess: VolumetricLightScatteringPostProcess;
        static EnabledPostProcesses: IEnabledPostProcesses;
        static NodesToStart: IAnimatable[];
        static AnimationSpeed: number;
        /**
        * Post-Processes
        */
        static CreateHDRPipeline(core: EditorCore, serializationObject?: any): HDRRenderingPipeline;
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
        static AddPlaneMesh(core: EditorCore): Mesh;
        static AddGroundMesh(core: EditorCore): Mesh;
        static AddHeightMap(core: EditorCore): Mesh;
        static AddParticleSystem(core: EditorCore, chooseEmitter?: boolean): void;
        static AddLensFlareSystem(core: EditorCore, chooseEmitter?: boolean, emitter?: any): void;
        static AddLensFlare(core: EditorCore, system: LensFlareSystem, size: number, position: number, color: any): LensFlare;
        static AddReflectionProbe(core: EditorCore): ReflectionProbe;
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture;
        static AddSkyMesh(core: EditorCore): Mesh;
        static AddWaterMesh(core: EditorCore): Mesh;
    }
}
