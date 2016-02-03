declare module BABYLON.EDITOR {
    class PostProcessesTool extends AbstractDatTool {
        tab: string;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _ssaoOnly(result);
        private _attachDetachPipeline(attach, pipeline);
        private _getPipelineCameras();
    }
}
