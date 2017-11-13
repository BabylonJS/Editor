export interface W2Item extends W2UI.W2Item {
    html?: string;
}

export default class Toolbar {
    // Public members
    public name: string;
    public items: W2Item[] = [];
    public right: string = null;

    public element: W2UI.W2Toolbar;

    public onClick: (target: string) => void;

    /**
     * Constructor
     * @param name the graph name 
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * Builds the graph
     * @param parentId the parent id
     */
    public build(parentId: string): void {
        this.element = $('#' + parentId).w2toolbar({
            name: this.name,
            items: this.items,
            onClick: (event) => {
                if (this.onClick)
                    this.onClick(event.target);
            },
            right: this.right
        });
    }
}
