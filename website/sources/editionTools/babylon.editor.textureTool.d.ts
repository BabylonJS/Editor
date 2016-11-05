declare module BABYLON.EDITOR {
    class TextureTool extends AbstractDatTool {
        tab: string;
        private _currentCoordinatesMode;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
    }
}
