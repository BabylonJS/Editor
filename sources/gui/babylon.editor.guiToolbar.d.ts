declare module BABYLON.EDITOR.GUI {
    class GUIToolbar extends GUIElement<W2UI.IToolbarElement> {
        menus: IToolbarMenuElement[];
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        createMenu(type: string, id: string, text: string, icon: string, checked?: boolean, tooltip?: string): IToolbarMenuElement;
        createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean, disabled?: boolean): IToolbarElement;
        createInput(id: string, inputId: string, text: string, size?: number): IToolbarMenuElement;
        addBreak(menu?: IToolbarMenuElement): IToolbarMenuElement;
        addSpacer(): IToolbarMenuElement;
        setItemChecked(item: string, checked: boolean, menu?: string): void;
        setItemAutoChecked(item: string, menu?: string): void;
        isItemChecked(item: string, menu?: string): boolean;
        setItemEnabled(item: string, enabled: boolean, menu?: string): boolean;
        getItemByID(id: string): IToolbarBaseElement;
        decomposeSelectedMenu(id: string): {
            hasParent: boolean;
            parent: string;
            selected: string;
        };
        buildElement(parent: string): void;
    }
}
