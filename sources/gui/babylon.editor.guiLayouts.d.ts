declare module BABYLON.EDITOR.GUI {
    class GUILayout extends GUIElement<W2UI.ILayoutsElement> {
        panels: Array<GUIPanel>;
        /**
        * Constructor
        * @param name: layouts name
        */
        constructor(name: string, core: EditorCore);
        createPanel(name: string, type: string, size: number, resizable?: boolean): GUIPanel;
        lockPanel(type: string, message?: string, spinner?: boolean): void;
        unlockPanel(type: string): void;
        getPanelFromType(type: string): GUIPanel;
        getPanelFromName(name: string): GUIPanel;
        setPanelSize(panelType: string, size: number): void;
        buildElement(parent: string): void;
    }
}
