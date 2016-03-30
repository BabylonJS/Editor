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
        * Resize element
        */
        resize(): void;
        /**
        * Add an event
        */
        on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void);
        /**
        * The element's style
        */
        style?: string;
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
    interface IGUIPanelTabChangedEvent {
        /**
        * The tab's id
        */
        tabID: string;
        /**
        * The called
        */
        caller: IGUIElement;
    }

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
        data: any;
        /**
        * Gets the node's parent
        */
        parent?: IGraphNodeElement;
        /**
        * Gets if the node is expanded or not
        */
        expanded?: boolean;
        /**
        * Count of elements in it
        */
        count?: number;
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
        setSelected(node: string): void;

        /**
        * Returns the selected node
        */
        getSelected(): string;

        /**
        * Return the selected node's data
        */
        getSelectedData(): Object;

        /**
        * Returns the selected node
        */
        getSelectedNode(): IGraphNodeElement;

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
        checked?: boolean;
    }

    interface IToolbarElement extends IToolbarBaseElement {
        /**
        * The item's icon
        */
        icon?: string;
        /**
        * The item's image
        */
        img?: string;
        /**
        * The element HTML (when input)
        */
        html?: string;
    }

    interface IToolbarMenuElement extends IToolbarBaseElement {
        /**
        * List of menu's items
        */
        items?: Array<IToolbarElement>;
        /**
        * The menu's image
        */
        img?: string;
        /**
        * The element HTML (when input)
        */
        html?: string;
        /**
        * The input callback
        */

    }

    interface IGUIToolbarElement extends IGUIElement {
        /**
        * Adds a new menu
        */
        createMenu(type: string, id: string, text: string, icon: string, checked?: boolean): IToolbarMenuElement;
        /**
        * Creates a menu item
        */
        createMenuItem(menu: IToolbarMenuElement, type: string, id: string, text: string, icon: string, checked?: boolean, disabled?: boolean): IToolbarElement;
        /**
        * Sets item checked
        */
        setItemChecked(item: string, checked: boolean, menu?: string): void;
        /**
        * sets item auto checked
        */
        setItemAutoChecked(item: string, menu?: string): void;
        /**
        * Returns if the item is cheked
        */
        isItemChecked(item: string, menu?: string): boolean;
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

    /**
    * Grid element
    */
    interface IGridRowData {
        /**
        * The id of the row (line number)
        */
        recid?: number;
        
        /**
        * The row style
        */
        style?: string;
    }

    interface IGridColumnEditable extends W2UI.IGridColumnEditable
    { }
    
    interface IGridColumnData extends W2UI.IGridColumnData
    { }

    interface IGUIGridElement<T> extends IGUIElement {
        /**
        * List of columns
        */
        columns: Array<IGridColumnData>;
        /**
        * Grid's header
        */
        header: string;
        /**
        * If show toolbar
        */
        showToolbar: boolean;
        /**
        * If show footer
        */
        showFooter: boolean;
        /**
        * If show delete button
        */
        showDelete: boolean;
        /**
        * If show add button
        */
        showAdd: boolean;
        /**
        * If show edit button
        */
        showEdit: boolean;

        /**
        * Creates a column
        */
        createColumn(id: string, text: string, size?: string): void;
        /**
        * Adds a row
        */
        addRow(data: T): void;
        /**
        * Removes a row
        */
        removeRow(recid: number): void;
        /**
        * Returns the number of rows
        */
        getRowCount(): number;
        /**
        * Returns the selected rows
        */
        getSelectedRows(): number[];
        /**
        * Returns the row at indice
        */
        getRow(indice: number): T;
        /**
        * Modifies the row at indice
        */
        modifyRow(indice: number, data: T): void;
    }

    /**
    * Window element
    */
    interface IGUIWindowElement extends IGUIElement {
        /**
        * Window's title
        */
        title: string;
        /**
        * Window's body. Example: HTML code
        */
        body: string;
        /**
        * Window's size (width, height)
        */ 
        size: Vector2;
        /**
        * Window's buttons
        */
        buttons: Array<string>;
        /**
        * If the window is modal
        */
        modal: boolean;
        /**
        * If show the close button
        */
        showClose: boolean;
        /**
        * If show the maximize button
        */
        showMax: boolean;
        /**
        * Toggle callback
        */
        onToggle: (maximized: boolean, width: number, height: number) => void;

        /**
        * Set the on close callback
        */
        setOnCloseCallback(callback: () => void): void;
        /**
        * Close the window
        */
        close(): void;
        /**
        * Maximize the window
        */
        maximize(): void;
    }
}