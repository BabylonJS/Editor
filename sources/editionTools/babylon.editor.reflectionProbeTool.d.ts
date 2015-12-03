declare module BABYLON.EDITOR {
    class ReflectionProbeTool extends AbstractDatTool implements IEventReceiver {
        object: Node;
        tab: string;
        private _window;
        private _excludedMeshesList;
        private _includedMeshesList;
        private _layouts;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        onEvent(event: Event): boolean;
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _setIncludedMeshes();
    }
}
