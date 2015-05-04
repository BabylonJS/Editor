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
        createField(id: string, type: string, caption: string, span: number, text: string): IGUIForm;
    }
}