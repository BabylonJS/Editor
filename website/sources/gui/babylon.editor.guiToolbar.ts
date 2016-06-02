module BABYLON.EDITOR.GUI {
    export class GUIToolbar extends GUIElement<W2UI.IToolbarElement> {
        // Public members
        public menus: IToolbarMenuElement[] = [];

        // Private members

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Creates a new menu
        public createMenu(type: string, id: string, text: string, icon: string, checked?: boolean, tooltip?: string): IToolbarMenuElement {
            var menu = {
                type: type,
                id: id,
                text: text,
                img: icon,
                checked: checked || false,
                hint: tooltip,
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

        // Creates a new input element
        public createInput(id: string, inputId: string, text: string, size: number = 10): IToolbarMenuElement {
            var item: IToolbarMenuElement = {
                type: "html",
                id: id,
                html:
                    "<div style=\"padding: 3px 10px;\">" +
                    text +
                    "    <input size=\"" + size + "\" id=\"" + inputId + "\" style=\"padding: 3px; border-radius: 2px; border: 1px solid silver\"/>" +
                    "</div>",
                text: text,
                
            };
            this.menus.push(item);

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

        // Adds a spacer
        public addSpacer(): IToolbarMenuElement {
            var item = {
                type: "spacer",
                id: undefined,
                text: undefined,
                img: undefined,
                icon: undefined,
                checked: undefined,
                items: undefined
            };
            this.menus.push(item);

            return item;
        }
        
        // Sets the item checked
        public setItemChecked(item: string, checked: boolean, menu?: string): void {
            var id = menu ? menu + ":" + item : item;

            checked ? this.element.check(id) : this.element.uncheck(id);
        }
        
        // Sets the item auto checked (true to false, false to true)
        public setItemAutoChecked(item: string, menu?: string): void {
            var result = this.element.get(menu ? menu + ":" + item : item);

            var checked = result ? result.checked : false;

            if (!checked)
                this.element.check(item);
            else
                this.element.uncheck(item);
        }

        // Returns if the item is checked
        public isItemChecked(item: string, menu?: string): boolean {
            var result = this.element.get(menu ? menu + ":" + item : item);

            if (result)
                return result.checked;

            return false;
        }

        // Sets an item enabled or not
        public setItemEnabled(item: string, enabled: boolean, menu?: string): boolean {
            var finalID = menu ? menu + ":" + item : item;

            var result = null;
            if (menu)
                result = this.element.get(menu);

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
                    this.element.enable(finalID);
                else
                    this.element.disable(finalID);
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

        // Returns the decomposed selected menu IDs
        public decomposeSelectedMenu(id: string): { hasParent: boolean, parent: string, selected: string } {
            var finalIDs = id.split(":");
            var item = this.getItemByID(finalIDs[finalIDs.length - 1]);

            if (!item)
                return null;

            return {
                hasParent: finalIDs.length > 1,
                parent: finalIDs[0],
                selected: finalIDs.length > 1 ? finalIDs[finalIDs.length - 1] : ""
            };
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