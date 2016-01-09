declare module BABYLON.EDITOR {
    class SceneFactory {
        static GenerateUUID(): string;
        static hdrPipeline: HDRRenderingPipeline;
        static ssaoPipeline: SSAORenderingPipeline;
        static NodesToStart: IAnimatable[];
        static AnimationSpeed: number;
        /**
        * Post-Processes
        */
        static CreateHDRPipeline(core: EditorCore): HDRRenderingPipeline;
        static CreateSSAOPipeline(core: EditorCore): SSAORenderingPipeline;
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
