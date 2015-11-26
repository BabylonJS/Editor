module BABYLON.EDITOR.GUI {
    export class GUIToolbar extends GUIElement implements IGUIToolbarElement {
        // Public members
        public menus: Array<IToolbarMenuElement> = new Array<IToolbarMenuElement>();

        // Private members

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Creates a new menu
        public createMenu(type: string, id: string, text: string, icon: string): IToolbarMenuElement {
            var menu = {
                type: type,
                id: id,
                text: text,
                img: icon,
                checked: false,
                items: []
            };
            this.menus.push(menu);

            return menu;
        }

        // Creates a new menu item
        public createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string): IToolbarElement {
            var item = {
                type: type,
                id: id,
                text: text,
                icon: icon,
                checked: false
            };
            menu.items.push(item);

            return item;
        }
        
        // Sets the item checked
        public setItemChecked(item: IToolbarElement, checked: boolean): void {
            var element = <W2UI.IToolbarElement>this.element;
            checked ? element.check(item.id) : element.uncheck(item.id);
        }
        
        // Sets the item auto checked (true to false, false to true)
        public setItemAutoChecked(item: IToolbarElement, checked: boolean): void {

        }

        // Returns if the item is checked
        public isItemChecked(item: IToolbarElement): boolean {
            return (<W2UI.IToolbarElement>this.element).get(item.id).checked;
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2toolbar({
                name: this.name,
                items: this.menus,
                onClick: (event: any) => {
                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.TOOLBAR_MENU_SELECTED);
                    ev.guiEvent.data = event.target;
                    this.core.sendEvent(ev);
                }
            });
        }
    }
}