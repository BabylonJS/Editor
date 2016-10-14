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
        clear(): void;
        layout(): void;
        setMousePosition(x: number, y: number): void;
        addNode<T>(id: string, name: string, color: string, type: string, parent?: string, data?: T): string;
        getTargetNodeType(): string;
        getTargetNodeId(): string;
        getNodeData(id: string): any;
        getNodesWithParent(parent: string): string[];
        getRootNodes(): string[];
        private _getNodeAtPosition(x, y);
    }
}
