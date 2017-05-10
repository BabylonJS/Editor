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
        removeNode(id: string, removeChildren?: boolean): void;
        getTargetNodeType(): string;
        getTargetNodeId(): string;
        getNodeName(id: string): string;
        getNodeType(id: string): string;
        getNodeData<T>(id: string): T;
        getNodesWithParent(parent: string): string[];
        getRootNodes(): string[];
        private _getNodeAtPosition(x, y);
    }
}
