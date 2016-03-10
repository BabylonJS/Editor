declare module BABYLON.EDITOR.GUI {
    class GUIGraph extends GUIElement<W2UI.IGraphElement> {
        menus: Array<IGraphMenuElement>;
        onGraphClick: (data: any) => void;
        onGraphDblClick: (data: any) => void;
        onMenuClick: (id: string) => void;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: string, text: string, img?: string): void;
        createNode(id: string, text: string, img?: string, data?: any): IGraphNodeElement;
        addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void;
        removeNode(node: IGraphNodeElement | string): void;
        setNodeExpanded(node: string, expanded: boolean): void;
        setSelected(node: string): void;
        getSelected(): string;
        getSelectedNode(): IGraphNodeElement;
        getNode(id: string): IGraphNodeElement;
        getSelectedData(): Object;
        clear(): void;
        buildElement(parent: string): void;
    }
}
