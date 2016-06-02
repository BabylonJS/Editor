declare module BABYLON.EDITOR {
    class EditPanel implements IEventReceiver {
        core: EditorCore;
        editor: EditorMain;
        panel: GUI.GUIPanel;
        onClose: () => void;
        private _containers;
        private _mainPanel;
        private _panelID;
        private _closeButtonID;
        private _closeButton;
        /**
        * Constructor
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        addContainer(container: string, id?: string): boolean;
        close(): void;
        setPanelSize(percents: number): void;
        private _addCloseButton();
        private _configureCloseButton();
    }
}
