module BABYLON.EDITOR.GUI {
    export class GUIList extends GUIElement {
        // Public members
        public items: Array<string> = new Array<string>();

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
            var element = <W2UI.IListElement>this.element;
            var value = element.val();

            return element.items.indexOf(value);
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