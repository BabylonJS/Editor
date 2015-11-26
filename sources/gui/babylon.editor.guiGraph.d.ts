declare module BABYLON.EDITOR.GUI {
    class GUIGraph extends GUIElement implements IGUIGraphElement {
        menus: Array<IGraphMenuElement>;
        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: string, text: string, img?: string): void;
        createNode(id: string, text: string, img?: string, data?: Object): IGraphNodeElement;
        addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void;
        removeNode(node: IGraphNodeElement): void;
        setNodeExpanded(node: string, expanded: boolean): void;
        setSelected(node: IGraphNodeElement): void;
        getSelected(): IGraphNodeElement;
        clear(): void;
        buildElement(parent: string): void;
    }
}
