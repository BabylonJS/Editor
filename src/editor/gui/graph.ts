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
    public element: W2UI.W2Sidebar;

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
     * Adds a context menu item to the graph when the user
     * right clicks on the node
     * @param menu the menu to add
     */
    public addMenu (menu: GraphMenu): void {
        this.element.menu.push(menu);
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

            // On the user clicks on a node
            onClick: (event) => {
                if (this.onClick && event.node)
                    this.onClick(event.node.id, event.node.data);
            },

            // On the user clicks on a context menu item
            onMenuClick: (event) => {
                if (this.onMenuClick) {
                    const node = <GraphNode> this.element.get(event.target);
                    this.onMenuClick(event.menuItem.id, node);
                }
            }
        });
    }
}