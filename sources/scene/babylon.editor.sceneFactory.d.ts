declare module BABYLON.EDITOR {
    interface IEnabledPostProcesses {
        hdr: boolean;
        attachHDR: boolean;
        ssao: boolean;
        ssaoOnly: boolean;
        attachSSAO: boolean;
    }
    class SceneFactory {
        static GenerateUUID(): string;
        static HDRPipeline: HDRRenderingPipeline;
        static SSAOPipeline: SSAORenderingPipeline;
        static EnabledPostProcesses: IEnabledPostProcesses;
        static NodesToStart: IAnimatable[];
        static AnimationSpeed: number;
        /**
        * Post-Processes
        */
        static CreateHDRPipeline(core: EditorCore, serializationObject?: any): HDRRenderingPipeline;
        static CreateSSAOPipeline(core: EditorCore, serializationObject?: any): SSAORenderingPipeline;
        /**
        * Nodes
        */
        static AddPointLight(core: EditorCore): PointLight;
        static AddDirectionalLight(core: EditorCore): DirectionalLight;
        static AddSpotLight(core: EditorCore): SpotLight;
        static AddHemisphericLight(core: EditorCore): HemisphericLight;
        static AddParticleSystem(core: EditorCore, chooseEmitter?: boolean): ParticleSystem;
        static AddReflectionProbe(core: EditorCore): ReflectionProbe;
        static AddRenderTargetTexture(core: EditorCore): RenderTargetTexture;
        static AddSkyMesh(core: EditorCore): Mesh;
    }
}
