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
}
