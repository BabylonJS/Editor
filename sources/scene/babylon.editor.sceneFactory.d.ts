declare module BABYLON.EDITOR {
    class SceneFactory {
        static GenerateUUID(): string;
        private static _hdrPipeline;
        private static _ssaoPipeline;
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
    }
}
