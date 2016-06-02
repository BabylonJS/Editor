declare module BABYLON.EDITOR.GUI {
    class Toolbar extends GUIElement implements IGUIToolbarElement {
        menus: Array<IToolbarMenuElement>;
        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore);
        createMenu(type: string, id: string, text: string, icon: string): IToolbarMenuElement;
        createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string): IToolbarElement;
        setItemChecked(item: IToolbarElement, checked: boolean): void;
        setItemAutoChecked(item: IToolbarElement, checked: boolean): void;
        isItemChecked(item: IToolbarElement): boolean;
        buildElement(parent: string): void;
    }
}
