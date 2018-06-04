export interface W2Item extends W2UI.W2Item {
    html?: string;
}

export default class Toolbar {
    // Public members
    public name: string;
    public items: W2Item[] = [];
    public right: string = undefined;

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
     * Returns if the given item is checked
     * @param id the id of the element (menu, item, etc.)
     */
    public isChecked (id: string, justClicked: boolean = false): boolean {
        const result = this.element.get(id);
        return justClicked ? !result['checked'] : result['checked'];
    }

    /**
     * Sets an item checked or unchecked
     * @param id the id of the item
     * @param checked if the item is checked or not
     */
    public setChecked (id: string, checked: boolean): void {
        if (checked)
            this.element.check(id);
        else
            this.element.uncheck(id);
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
