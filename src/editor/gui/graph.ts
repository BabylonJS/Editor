export interface GraphNode {
    id: string;
    text: string;

    img?: string;
    data?: any;
    count?: number;
}

export interface GraphMenu {
    id: string;
    text: string;
    img: string;
}

export default class Graph {
    // Public members
    public name: string;

    public topContent: string;
    public bottomContent: string;

    public onClick: <T>(id: string, data: T) => void;
    public onMenuClick: <T>(id: string, node: GraphNode) => void;

    /**
     * Constructor
     * @param name the graph name 
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Clear the graph
     */
    public clear (): void {
        const toRemove = [];

    }

    /**
     * Adds the given node to the graph
     * @param node: the node to add into the graph
     * @param parent: the optional parent of the node
     */
    public add (node: GraphNode, parent?: string): void {
    }

    /**
     * Adds a context menu item to the graph when the user
     * right clicks on the node
     * @param menu the menu to add
     */
    public addMenu (menu: GraphMenu): void {
    }

    /**
     * Builds the graph
     * @param parentId the parent id
     */
    public build (parentId: string): void {

    }
}
