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
        public createMenu(type: string, id: string, text: string, icon: string, checked?: boolean): IToolbarMenuElement {
            var menu = {
                type: type,
                id: id,
                text: text,
                img: icon,
                checked: checked || false,
                items: []
            };
            this.menus.push(menu);

            return menu;
        }

        // Creates a new menu item
        public createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean): IToolbarElement {
            var item = {
                type: type,
                id: id,
                text: text,
                icon: icon,
                checked: checked || false
            };
            menu.items.push(item);

            return item;
        }
        
        // Sets the item checked
        public setItemChecked(item: IToolbarBaseElement, checked: boolean, menu?: IToolbarMenuElement): void {
            var element = <W2UI.IToolbarElement>this.element;
            var id = menu ? menu.id + ":" + item.id : item.id;

            checked ? element.check(id) : element.uncheck(id);
        }
        
        // Sets the item auto checked (true to false, false to true)
        public setItemAutoChecked(item: IToolbarBaseElement, menu?: IToolbarMenuElement): void {
            var element = <W2UI.IToolbarElement>this.element;
            var result = element.get(menu ? menu.id + ":" + item.id : item.id);

            var checked = result ? result.checked : false;

            if (!checked)
                element.check(item.id);
            else
                element.uncheck(item.id);
        }

        // Returns if the item is checked
        public isItemChecked(item: IToolbarBaseElement, menu?: IToolbarMenuElement): boolean {
            var result = (<W2UI.IToolbarElement>this.element).get(menu ? menu.id + ":" + item.id : item.id);

            if (result !== null)
                result.checked;

            return false;
        }

        // Returns an item by its ID
        public getItemByID(id: string): IToolbarBaseElement {
            for (var i = 0; i < this.menus.length; i++) {
                var menu = this.menus[i];
                
                if (menu.id === id)
                    return menu;
                
                for (var j = 0; j < menu.items.length; j++) {
                    var item = menu.items[j];

                    if (item.id === id)
                        return item;
                }
            }

            return null;
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