import Tools from "../tools/tools";

export interface W2Item extends W2UI.W2Item {
    html?: string;
    selected?: string[];
    hidden?: boolean;
}

export default class Toolbar {
    // Public members
    public name: string;
    public items: W2Item[] = [];
    public right: string = undefined;
    public helpUrl: string = undefined;

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
        const result = <W2Item> this.element.get(id);
        return justClicked ? !result.checked : result.checked;
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
     * Sets an item enabled or disabled
     * @param id the id of the item
     * @param enabled if the item is enabled or not
     */
    public enable (id: string, enabled: boolean): void {
        if (enabled)
            this.element.enable(id);
        else
            this.element.disable(id);
    }

    /**
     * Updates the given item
     * @param id the id of the item to update
     * @param data the new item
     */
    public updateItem (id: string, data: W2Item): void {
        const item = this.element.get(id);
        Object.assign(item, data);

        this.element.refresh(id);
    }

    /**
     * Notifies the given message on the right
     * @param message the message to notify
     */
    public notifyMessage (message: string): void {
        this.element.right = message;
        this.element.render();
    }

    /**
     * Builds the graph
     * @param parentId the parent id
     */
    public build(parentId: string): void {
        if (this.helpUrl) {
            this.items.push({ type: 'break' });
            this.items.push({ type: 'button', id: 'generated-help-button', img: 'icon-help', caption: 'Help...', text: 'Help...' });
        }

        this.element = $('#' + parentId).w2toolbar({
            name: this.name,
            items: this.items,
            onClick: (event) => {
                if (event.target === 'generated-help-button')
                    Tools.OpenPopup(this.helpUrl, 'Documentation', 1280, 800);
                
                if (this.onClick)
                    this.onClick(event.target);
            },
            right: this.right
        });
    }
}
