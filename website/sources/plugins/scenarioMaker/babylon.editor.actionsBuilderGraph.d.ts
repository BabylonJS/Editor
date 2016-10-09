declare module BABYLON.EDITOR {
    class ActionsBuilderGraph {
        canvasElement: JQuery;
        onMouseUp: () => void;
        private _core;
        private _graph;
        private _mousex;
        private _mousey;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore);
        createGraph(containerID: string): void;
        setMousePosition(x: number, y: number): void;
        addNode<T>(id: string, name: string, color: string, type: string, data?: T): void;
        getTargetNodeType(): string;
        getTargetNodeId(): string;
        getNodeData(id: string): any;
        private _getNodeAtPosition(x, y);
    }
}
