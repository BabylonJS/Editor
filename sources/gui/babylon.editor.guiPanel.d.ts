declare module BABYLON.EDITOR.GUI {
    class GUIPanel extends GUIElement implements IGUIPanel {
        tabs: Array<IGUITab>;
        type: string;
        size: number;
        minSize: number;
        maxSize: any;
        content: string;
        resizable: boolean;
        style: string;
        toolbar: any;
        _panelElement: W2UI.IPanelElement;
        /**
        * Constructor
        * @param name: panel name
        * @param type: panel type (left, right, etc.)
        * @param size: panel size
        * @param resizable: if the panel is resizable
        */
        constructor(name: string, type: string, size: number, resizable: boolean);
        createTab(tab: IGUITab): IGUIPanel;
        removeTab(id: string): boolean;
        getTabCount(): number;
        setTabEnabled(id: string, enable: boolean): IGUIPanel;
        getTabIDFromIndex(index: number): string;
        setContent(content: string): IGUIPanel;
    }
}
