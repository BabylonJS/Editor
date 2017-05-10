declare module BABYLON.EDITOR {
    class GeneralTool extends AbstractDatTool {
        object: Node;
        tab: string;
        private _isActiveCamera;
        private _isActivePlayCamera;
        private _currentParentName;
        private _currentInstance;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _castShadows;
        private _setChildrenCastingShadows(node);
        private _createNewInstance();
        private _removeInstance();
    }
}
