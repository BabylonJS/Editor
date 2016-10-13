module BABYLON.EDITOR.GUI {
    export class GUIList extends GUIElement<W2UI.IListElement> {
        // Public members
        public items: string[] = [];
        public renderDrop: boolean = false;
        public selected: string = "";
        public onChange: (selected: string) => void;

        // Private members

        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Creates a new item
        public addItem(name: string): IGUIListElement {
            this.items.push(name);

            return this;
        }

        // Returns the selected item
        public getSelected(): number {
            var value = this.element.val();

            return this.element.items.indexOf(value);
        }

        // Returns the value of the element
        public getValue(): string {
            return this.element.val();
        }

        // Build element
        public buildElement(parent: string): void {
            var parentElement = $("#" + parent);
            
            this.element = (<any>parentElement).w2field("list", {
                items: this.items,
                selected: this.items.length > 0 ? this.items[0] : "",

                renderItem: (item): string => {
                    return item.text;
                },

                renderDrop: !this.renderDrop ? undefined : (item) => {
                    return item.text;
                },

                compare: (item, search) => {
                    return item.indexOf(search) !== -1;
                }
            });

            this.element.val(this.selected);

            this.element.change((event: any) => {
                if (this.onChange)
                    this.onChange(this.element.val());
            });
        }
    }
}