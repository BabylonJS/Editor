declare module W2UI {

    /**
    * IEvent interface
    */
    interface IEvent {
        /**
        * Event type: click, etc.
        */
        type: string;
        /**
        * Execute type: after, before
        */
        execute?: string;
    }

    /**
    * IElement interface
    */
    interface IElement {
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
        on(event: IEvent, callback: (target: any, eventData: any) => void);
        /**
        * The element's style
        */
        style?: string;
        /**
        * Resize element
        */
        resize(): void;
        /**
        * Box HTML Element
        */
        box?: HTMLElement;
    }

    /**
    * Tabs elements
    */
    interface ITabElement {
        /**
        * Tab id
        */
        id: string;
        /**
        * Tab caption
        */
        caption: string;
    }

    interface ITabsController extends IElement {
        /**
        * Add tab to controller
        */
        add(tab: ITabElement): void;
        /**
        * Removes tab from id
        */
        remove(id: string): void
        /**
        * Enable tab
        */
        enable(id: string);
        /**
        * Disable tab
        */
        disable(id: string);
        /**
        * Hide tab
        */
        hide(id: string): number;
        /**
        * Show tab
        */
        show(id: string): number;
    }

    /**
    * Panel element
    */
    interface IPanelElement {
        /**
        * Tabs controller
        */
        tabs: ITabsController;
        /**
        * Panel type
        */
        type: string;
        /**
        * The panel width
        */
        width: number;
        /**
        * The panel height
        */
        height: number;
    }

    interface IPanelTabController {
        /**
        * on click event
        */
        onClick: (event: any) => void;
    }

    /**
    * Layouts element
    */
    interface ILayoutsElement extends IElement {
        /**
        * Sets panel size from type
        */
        sizeTo(panelType: string, size: number): void;
        /**
        * Returns panel element from type
        */
        get(panelType: string): IPanelElement;
        /**
        * Gets the tabs of the panel
        */
        tabs: IPanelTabController;
        /**
        * Lock the given panel
        */
        lock(type: string, message?: string, spinner?: boolean): void;
        /**
        * Unlock the given panel
        */
        unlock(type: string): void;
    }

    /**
    * Form element
    */
    interface IFormElement extends IElement {
        /**
        * Form's records
        */
        record: Object;
    }

    /**
    * Graph element
    */
    interface IGraphNodeElement extends BABYLON.EDITOR.GUI.IGraphNodeElement {
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

    interface IGraphMenuElement extends BABYLON.EDITOR.GUI.IGraphMenuElement {
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

    interface IGraphElement extends IElement {
        /**
        * Adds a new node to the graph (parent is root)
        */
        add(nodes: IGraphNodeElement[]): void;
        /**
        * Adds a new node to the graph with the provided parent has parent
        */
        add(parent: string, nodes: IGraphNodeElement[] | IGraphNodeElement): void;
        /**
        * Removes the provided node from the graph
        */
        remove(node: IGraphNodeElement | string): void;
        /**
        * Expands the provided node
        */
        expand(node: string): void;
        /* *
        * Collapses the provided node
        */
        collapse(node: string): void;
        /**
        * Returns the nodes of the graph starting from the provided parent
        * If parent is undefined (not required), the function returns all
        * the nodes of the grpah
        */
        get(parent?: IGraphNodeElement | string): IGraphNodeElement;
        /**
        * Sets the provided node as selected
        */
        select(node: string): void;
        /**
        * Scrolls info view
        */
        scrollIntoView(node: string): void;
        /**
        * Gets the selected node
        */
        selected: string;
        /**
        * Array of nodes in the graph
        */
        nodes: IGraphNodeElement[];
        /**
        * Returns the sidebar element
        */
        sidebar: any;
    }

    /**
    * Toolbar
    */
    interface IToolbarItem {
        /**
        * The item's type
        */
        type: string;
        /**
        * The item's id
        */
        id: string;
        /**
        * The item's text
        */
        text: string;
        /**
        * The icon of the item
        */
        icon: string;
        /**
        * If the item is checked or not
        */
        checked: boolean;
        /**
        * If item is disabled
        */
        disabled: boolean;
    }

    interface IToolbarMenu {
        /**
        * The list of items
        */
        items: Array<IToolbarItem>;
        /**
        * The menu's type. Can be a button
        */
        type: string;
        /**
        * The menu's id
        */
        id: string;
        /**
        * The menu's text
        */
        text: string;
        /**
        * The menu's icon
        */
        icon: string;
        /**
        * If the menu is checked or not
        */
        checked: boolean;
        /**
        * If item is disabled
        */
        disabled: boolean;
    }

    interface IToolbarElement extends IElement {
        /**
        * Checks the toolbar item
        */
        check(item: string): void;
        /**
        * Unchecks the toolbar item
        */
        uncheck(item: string): void;
        /**
        * Returns a toolbar item
        */
        get(item: string): IToolbarItem;
        /**
        * Enable an item
        */
        enable(...args: string[]): void;
        /**
        * Disable items
        */
        disable(...args: string[]): void;
    }

    /**
    * Dialog element
    */
    interface IDialogElement extends IElement {
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
    * List element
    */
    interface IListItem {
        /**
        * The item ID
        */
        id: number;
        /**
        * The item's text
        */
        text: string;
    }
    
    interface IListElement extends IElement {
        /**
        * List of items
        */
        items: Array<string>;
        /**
        * Returns the selected item
        */
        val(): string;
    }

    /**
    * Grid element
    */
    interface IGridMenu {
        /**
        * Menu id
        */
        id: number;
        /**
        * Menu text
        */
        text: string;
        /**
        * Menu icon
        */
        icon: string;
    }

    interface IGridRowData {
        /**
        * The id of the row (line number)
        */
        recid: number;
    }
    
    interface IGridColumnEditable {
        /**
        * The type edition. Can be "text", "combo", "select", etc.
        */
        type: string;
        
        /**
        *  If the type is "combo"
        */
        items?: IListItem[] | string[];
    }

    interface IGridColumnData {
        /**
        * The column ID
        */
        field: string;
        /**
        * The column's caption
        */
        caption: string;
        /**
        * The columns size
        */
        size: string;
        
        /**
        * If the column is editable
        */
        editable?: IGridColumnEditable;
        /**
        * The column style
        */
        style?: string;
    }

    interface IGridElement<T> extends IElement {
        /**
        * Returns total of rows
        */
        total: number;
        /**
        * Returns a row
        */
        get(indice: number): T;
        /**
        * Sets the row
        */
        set(indice: number, data: T): void;
        /**
        * Adds a row to the grid
        */
        add(data: T): void;
        /**
        * Clear the grid
        */
        clear(): void;
        /**
        * Removes a row
        */
        remove(recid: number): void;
        /**
        * Returns the selection
        */
        getSelection(): number[];
        /**
        * Set the selected
        */
        select(...args: any[]): void;
        /**
        * Locks the grid
        */
        lock(message: string, spinner?: boolean): void;
        /**
        * Unlock the grid
        */
        unlock(): void;
        /**
        * Records of the grid
        */
        records: T[];
        /**
        * Returns the changed elements (if editable)
        */
        getChanges(): T[];
        /**
        * Scroll into view, giving the indice of the row
        */
        scrollIntoView(indice: number): void;
        /**
        * Merges user changes into the records array
        */
        mergeChanges(): void;
    }

    /**
    * Window element
    */
    interface IWindowElement extends IElement {
        /**
        * Close window
        */
        close(): void;
        /**
        * Clear the window
        */
        clear(): void
        /**
        * On close event
        */
        onClose: () => void;
        /**
        * Maximize the window
        */
        max(): void;
        /**
        * On maximize event
        */
        onMax: (event: any) => void;
        /**
        * On minimize event
        */
        onMin: (event: any) => void;
        /**
        * On toggle event
        */
        onToggle: (maximized: boolean, width: number, height: number) => void;
    }

    /**
    * Window confirm element
    */
    interface IWindowConfirmDialog extends IElement {
        yes(callback: () => void): IWindowConfirmDialog;
        no(callback: () => void): IWindowConfirmDialog;
    }
}

/**
* Declares
*/
declare var w2confirm: {
    (body: string, title: string, callback: (result: any) => void): W2UI.IWindowConfirmDialog;
}

declare var w2alert: {
    (msg: string, title?: string, callback?: () => void): W2UI.IElement;
}

declare var w2popup: {
    open(data: any): W2UI.IWindowElement;
    message(data: any): W2UI.IWindowElement;
    lock(msg?: string): void;
    unlock(): void;
}

declare var w2obj: {
    grid: Function;
}

declare var w2utils: {
    lang(text: string): string;

    lock(box: HTMLElement | JQuery, message: string, showSpinner: boolean): void;
    lock(box: HTMLElement | JQuery, options: { msg: string; spinner: boolean; opacity: number; });

    unlock(box: HTMLElement | JQuery): void;
}

declare var w2ui: {
    
}
