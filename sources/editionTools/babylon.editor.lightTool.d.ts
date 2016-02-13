declare module BABYLON.EDITOR {
    class LightTool extends AbstractDatTool {
        tab: string;
        private _customShadowsGeneratorSize;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _createShadowsGenerator();
        private _removeShadowGenerator();
    }
}
