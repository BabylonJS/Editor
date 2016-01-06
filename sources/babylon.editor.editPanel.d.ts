declare module BABYLON.EDITOR {
    class EditPanel {
        core: EditorCore;
        editor: EditorMain;
        panel: GUI.GUIPanel;
        onClose: () => void;
        private _containers;
        private _mainPanel;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        addContainer(container: string, id?: string): boolean;
        close(): void;
        setPanelSize(percents: number): void;
    }
}
