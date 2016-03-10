declare module BABYLON.EDITOR {
    class PostProcessesTool extends AbstractDatTool {
        tab: string;
        private _hdrDebugPasses;
        private _downSamplerName;
        private _enableDownSampler;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        drawBrightPass(): void;
        update(): boolean;
        private _ssaoOnly(result);
        private _attachDetachPipeline(attach, pipeline);
        private _getPipelineCameras();
        private _loadHDRLensDirtTexture();
    }
}
