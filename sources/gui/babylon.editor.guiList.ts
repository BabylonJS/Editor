module BABYLON.EDITOR.GUI {
    export class GUIList extends GUIElement<W2UI.IListElement> {
        // Public members
        public items: Array<string> = [];

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

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("input[type = list]" + "#" + parent)).w2field("list", {
                items: this.items,
                selected: this.items.length > 0 ? this.items[0] : ""
            });
        }
    }
}