declare module BABYLON.EDITOR {
    class SceneTool extends AbstractTool {
        scene: Scene;
        tab: string;
        private _element;
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
