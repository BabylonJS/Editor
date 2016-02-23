declare module BABYLON.EDITOR.GUI {
    class GUIPanel extends GUIElement<W2UI.IElement> {
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
        * @param core: the editor core
        */
        constructor(name: string, type: string, size: number, resizable: boolean, core: EditorCore);
        createTab(tab: IGUITab): GUIPanel;
        removeTab(id: string): boolean;
        width: number;
        height: number;
        getTabCount(): number;
        setTabEnabled(id: string, enable: boolean): GUIPanel;
        getTabIDFromIndex(index: number): string;
        setContent(content: string): GUIPanel;
        hideTab(id: string): boolean;
        showTab(id: string): boolean;
    }
}
