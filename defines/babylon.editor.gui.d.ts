declare module BABYLON.EDITOR.GUI {
    /*
    * GUI Element
    */
    interface IGUIElement extends W2UI.IElement {
        /**
        * Destroys the element
        */
        destroy(): void;
        /**
        * Refresh the element
        */
        refresh(): void;
        /**
        * Add an event
        */
        on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void);
        /**
        * Build the element
        */
        buildElement(parent: string): void;
    }

   /*
   * GUI Tabs Element
   */
    interface IGUITab {
        /**
        * Tab id
        */
        id: string;
        /**
        * Tab caption
        */
        caption: string;
    }

    interface IGUITabController extends IGUIElement {
        /**
        * Clears the tabs
        */
        clearTabs(): void;
        /**
        * Add a tab to the tab controller
        */
        addTab(tab: IGUITab): IGUITabController;
    }

    /**
    * GUI Panel
    */
    interface IGUIPanel extends IGUIElement {
        /**
        * Creates a tab
        */
        createTab(tab: IGUITab): IGUIPanel;
        /**
        * Remove a tab
        */
        removeTab(id: string): boolean;
        /**
        * Returns the tabs count
        */
        getTabCount(): number;
        /**
        * Sets a tab enabled or not
        */
        setTabEnabled(id: string, enable: boolean): IGUIPanel;
        /**
        * Returns the tab id from the index
        */
        getTabIDFromIndex(index: number): string;
        /**
        * Sets the HTML content into the panel
        */
        setContent(content: string): IGUIPanel;
        /**
        * Hide tab
        */
        hideTab(id: string): boolean;
        /**
        * Show tab
        */
        showTab(id: string): boolean;
        /**
        *
        */
        width: number;
    }

    /**
    * GUI Layout
    */
    interface IGUILayout extends IGUIElement {
        /**
        * Creates a panel
        */
        createPanel(id: string, type: string, size: number, resizable: boolean): IGUIPanel;
        /**
        * Returns the panel from type (left, right etc.)
        */
        getPanelFromType(type: string): IGUIPanel;
        /**
        * Returns the panel from id
        */
        getPanelFromName(name: string): IGUIPanel;
        /**
        * Sets panel size
        */
        setPanelSize(type: string, size: number): void;
    }

    /**
    * GUI Forms
    */
    interface IGUIFormFieldHTML {
        caption: string;
        span: number;
        text: string;
    }

    interface IGUIFormField {
        name: string;
        type: string;
        html: IGUIFormFieldHTML;
    }

    interface IGUIForm extends IGUIElement {
        /**
        * Create a field
        */
        createField(id: string, type: string, caption: string, span: number, text: string, options: any): IGUIForm;
        /**
        * Updates given record
        */
        setRecord(name: string, value: any): void;
    }

    /**
    * Graph element
    */
    interface IGraphNodeElement {
        /**
        * Node's id
        */
        id: string;
        /**
        * Node's text
        */
        text: string;
        /**
        * Node's image
        */
        img: string;
        /**
        * Node's data (any object)
        */
        data: Object;
        /**
        * Gets the node's parent
        */
        parent?: IGraphNodeElement;
        /**
        * Gets if the node is expanded or not
        */
        expanded?: boolean;
    }

    interface IGraphMenuElement {
        /**
        * Menu's id
        */
        id: string;
        /**
        * Menu's text
        */
        text: string;
        /**
        * Menu's image
        */
        img: string;
    }

    interface IGUIGraphElement extends IGUIElement {
        /**
        * Menus associated to the graph (right-click)
        */
        menus: Array<IGraphMenuElement>;

        /**
        * Adds a menu (right-click)
        */
        addMenu(id: string, text: string, img: string): void;

        /**
        * Creates a new node and returns its reference
        */
        createNode(id: string, text: string, img: string, data?: Object): IGraphNodeElement;

        /**
        * Adds new nodes to the graph
        */
        addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void;

        /**
        * Removes the provided node
        */
        removeNode(node: IGraphNodeElement | string): void;

        /**
        * Sets if the provided node is expanded or not
        */
        setNodeExpanded(node: string, expanded: boolean): void;

        /**
        * Sets the selected node
        */
        setSelected(node: IGraphNodeElement): void;

        /**
        * Returns the selected node
        */
        getSelected(): string;

        /**
        * Clears the graph
        */
        clear(): void;
    }

    /**
    * Toolbar element
    */
    interface IToolbarBaseElement {
        /**
        * The item's id
        */
        id: string;
        /**
        * The item's type
        */
        type: string;
        /**
        * The item's text
        */
        text: string;
        /**
        * If the item is checked or not
        */
        checked: boolean;
    }

    interface IToolbarElement extends IToolbarBaseElement {
        /**
        * The item's icon
        */
        icon: string;
    }

    interface IToolbarMenuElement extends IToolbarBaseElement {
        /**
        * List of menu's items
        */
        items: Array<IToolbarElement>;
        /**
        * The menu's image
        */
        img: string;
    }

    interface IGUIToolbarElement extends IGUIElement {
        /**
        * Adds a new menu
        */
        createMenu(type: string, id: string, text: string, icon: string, checked?: boolean): IToolbarMenuElement;
        /**
        * Creates a menu item
        */
        createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean): IToolbarElement;
        /**
        * Sets item checked
        */
        setItemChecked(item: IToolbarBaseElement, checked: boolean, menu?: IToolbarMenuElement): void;
        /**
        * sets item auto checked
        */
        setItemAutoChecked(item: IToolbarBaseElement, menu?: IToolbarMenuElement): void;
        /**
        * Returns if the item is cheked
        */
        isItemChecked(item: IToolbarBaseElement, menu?: IToolbarMenuElement): boolean;
        /**
        * Returns an item by id
        */
        getItemByID(id: string, menu?: IToolbarMenuElement): IToolbarBaseElement;
        /**
        * Adds a break
        */
        addBreak(menu?: IToolbarMenuElement): IToolbarMenuElement;
    }

    /**
    * List element
    */
    interface IGUIListElement extends IGUIElement {
        /**
        * Adds a list item
        */
        addItem(name: string): IGUIListElement;
        /**
        * Returns the selected item
        */
        getSelected(): number;
    }

    /**
    * Dialog element
    */
    interface IGUIDialogElement extends IGUIElement {
        /**
        * The dialog's title
        */
        title: string;
        /**
        * The dialog's body
        */
        body: string;
    }
}