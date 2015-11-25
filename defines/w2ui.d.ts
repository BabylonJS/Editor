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
        execute: string;
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
        remove(node: IGraphNodeElement): void;
        /**
        * Expands the provided node
        */
        expand(node: string): void;
        /**
        * Collapses the provided node
        */
        collapse(node: string): void;
        /**
        * Returns the nodes of the graph starting from the provided parent
        * If parent is undefined (not required), the function returns all
        * the nodes of the grpah
        */
        get(parent?: IGraphNodeElement): IGraphNodeElement;
        /**
        * Sets the provided node as selected
        */
        select(node: IGraphNodeElement): void;
        /**
        * Gets the selected node
        */
        selected: IGraphNodeElement;
        /**
        * Array of nodes in the graph
        */
        nodes: IGraphNodeElement[];
    }

}
