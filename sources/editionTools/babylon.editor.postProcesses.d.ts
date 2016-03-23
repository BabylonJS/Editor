declare module BABYLON.EDITOR {
    class PostProcessesTool extends AbstractDatTool {
        tab: string;
        private _renderEffects;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _setVLSAttachedNode();
        private _setupDebugPipeline(folder, pipeline);
        private _attachDetachPipeline(attach, pipeline);
        private _getPipelineCameras();
        private _loadHDRLensDirtTexture();
    }
}
