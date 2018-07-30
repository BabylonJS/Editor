export default class List {
    // Public members
    public name: string;

    public element: JQuery = null;
    public input: JQuery = null;

    public items: string[] = [];

    public onChange: (selected: string) => void;

    /**
     * Constructor
     * @param name the name of the list
     */
    constructor (name) {
        this.name = name;
    }

    /**
     * Sets the new items
     * @param items the new items
     */
    public setItems (items: string[]): void {
        this.items = items;

        const field = (<any> this.element).data('w2field');
        field.options.items = items.map(v => {
            return { id: v, text: v }  
        });
        field.refresh();
    }

    /**
     * Sets the selected item
     * @param text: the item's text
     */
    public setSelected (text: string): void {
        const field = (<any> this.element).data('w2field');
        const item = field.options.items.find(i => i.text === text);

        if (item) {
            field.options.selected = item;
            field.refresh();
        }
    }

    /**
     * Returns the selected value of the list
     */
    public getSelected (): string {
        return <string> this.element.val();
    }

    /**
     * Builds the element
     * The parent HTML element
     */
    public build (parent: HTMLElement, style: string = ''): void {
        this.input = $(`<input type="list" style="${style}" />`);
        $(parent).append(this.input);

        this.element = (<any> this.input).w2field('list', {
            items: this.items.map(v => {
                return { id: v, text: v };
            }),
            selected: { id: this.items[0], text: this.items[0] },
            renderItem: (item): string => {
                return item.text;
            },
            renderDrop: (item) => {
                return item.text;
            },
            compare: (item, search) => {
                return item.text.indexOf(search) !== -1;
            }
        });

        this.element.change(ev => this.onChange && this.onChange(<string> this.element.val()));
    }
}