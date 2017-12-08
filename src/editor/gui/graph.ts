export interface GraphNode {
    id: string;
    text: string;

    img?: string;
    data?: any;
    count?: number;
}

export default class Graph {
    // Public members
    public name: string;
    public element: W2UI.W2Sidebar;

    public topContent: string;
    public bottomContent: string;

    public onClick: <T>(id: string, data: T) => void;

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

        this.element.nodes.forEach((n: any) => toRemove.push(n.id));
        this.element.remove.apply(this.element, toRemove);
        this.element.nodes = [];

        this.element.refresh();
    }

    /**
     * Adds the given node to the graph
     * @param node: the node to add into the graph
     * @param parent: the optional parent of the node
     */
    public add (node: GraphNode, parent?: string): void {
        this.element.add(<string>(parent || this.element), node);
    }

    /**
     * Builds the graph
     * @param parentId the parent id
     */
    public build (parentId: string): void {
        this.element = $('#' + parentId).w2sidebar({
            name: this.name,
            img: 'icon-container',
            keyboard: false,
            nodes: [],

            topHTML: this.topContent,
            bottomHTML: this.bottomContent,

            onClick: (event) => {
                if (this.onClick && event.node)
                    this.onClick(event.node.id, event.node.data);
            }
        });
    }
}