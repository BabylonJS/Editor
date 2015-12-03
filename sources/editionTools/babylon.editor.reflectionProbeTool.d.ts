declare module BABYLON.EDITOR {
    class ReflectionProbeTool extends AbstractDatTool {
        object: Node;
        tab: string;
        private _window;
        private _excludedMeshesList;
        private _includedMeshesList;
        private _layout;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _setIncludedMeshes();
    }
}
