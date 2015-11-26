declare module BABYLON.EDITOR.GUI {
    class GUILayout extends GUIElement implements IGUILayout {
        panels: Array<GUIPanel>;
        /**
        * Constructor
        * @param name: layouts name
        */
        constructor(name: string, core: EditorCore);
        createPanel(name: string, type: string, size: number, resizable?: boolean): IGUIPanel;
        getPanelFromType(type: string): IGUIPanel;
        getPanelFromName(name: string): IGUIPanel;
        setPanelSize(panelType: string, size: number): void;
        buildElement(parent: string): void;
    }
}
