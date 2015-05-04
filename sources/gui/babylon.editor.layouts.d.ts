declare module BABYLON.EDITOR.GUI {
    class GUILayout extends GUIElement {
        constructor(name: string);
        createPanel(id: string, type: string, size: number, resizable: boolean): IGUIPanel;
        getPanelFromType(type: string): IGUIPanel;
        getPanelFromID(id: string): IGUIPanel;
        setPanelSize(type: string, size: number): void;
        buildElement(parent: string): GUILayout;
    }
}
