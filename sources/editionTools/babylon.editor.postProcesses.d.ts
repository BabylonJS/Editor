declare module BABYLON.EDITOR {
    class PostProcessesTool extends AbstractTool {
        tab: string;
        private _element;
        private _enabledPostProcesses;
        private _hdrPipeline;
        private _ssaoPipeline;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
    }
}
