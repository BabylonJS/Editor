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
        public createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean, disabled?: boolean): IToolbarElement {
            var item = {
                type: type,
                id: id,
                text: text,
                icon: icon,
                checked: checked || false,
                disabled: disabled || false
            };
            menu.items.push(item);

            return item;
        }

        // Adds a break
        public addBreak(menu?: IToolbarMenuElement): IToolbarMenuElement {
            var item = {
                type: "break",
                id: undefined,
                text: undefined,
                img: undefined,
                icon: undefined,
                checked: undefined,
                items: undefined
            };

            if (menu)
                menu.items.push(item);
            else
                this.menus.push(item);

            return item;
        }
        
        // Sets the item checked
        public setItemChecked(item: string, checked: boolean, menu?: string): void {
            var element = <W2UI.IToolbarElement>this.element;
            var id = menu ? menu + ":" + item : item;

            checked ? element.check(id) : element.uncheck(id);
        }
        
        // Sets the item auto checked (true to false, false to true)
        public setItemAutoChecked(item: string, menu?: string): void {
            var element = <W2UI.IToolbarElement>this.element;
            var result = element.get(menu ? menu + ":" + item : item);

            var checked = result ? result.checked : false;

            if (!checked)
                element.check(item);
            else
                element.uncheck(item);
        }

        // Returns if the item is checked
        public isItemChecked(item: string, menu?: string): boolean {
            var result = (<W2UI.IToolbarElement>this.element).get(menu ? menu + ":" + item : item);

            if (result)
                return result.checked;

            return false;
        }

        // Sets an item enabled or not
        public setItemEnabled(item: string, enabled: boolean, menu?: string): boolean {
            var finalID = menu ? menu + ":" + item : item;

            var result = null;
            if (menu)
                result = (<W2UI.IToolbarElement>this.element).get(menu);

            if (result) {
                for (var i = 0; i < result.items.length; i++) {
                    if (result.items[i].id === item) {
                        result.items[i].disabled = !enabled;
                        this.refresh();
                        break;
                    }
                }
            }
            else {
                if (enabled)
                    (<W2UI.IToolbarElement>this.element).enable(finalID);
                else
                    (<W2UI.IToolbarElement>this.element).disable(finalID);
            }

            if (result)
                return true;

            return false;
        }

        // Returns an item by its ID
        public getItemByID(id: string): IToolbarBaseElement {
            for (var i = 0; i < this.menus.length; i++) {
                var menu = this.menus[i];

                if (menu.type === "break")
                    continue;
                
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