declare module BABYLON.EDITOR {
    class LightTool extends AbstractTool {
        tab: string;
        private _element;
        private _customShadowsGeneratorSize;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
        private _createShadowsGenerator();
        private _removeShadowGenerator();
    }
}
