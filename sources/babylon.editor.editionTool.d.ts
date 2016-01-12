declare module BABYLON.EDITOR {
    class EditionTool implements ICustomUpdate, IEventReceiver {
        object: any;
        container: string;
        editionTools: Array<ICustomEditionTool>;
        panel: GUI.IGUIPanel;
        core: EditorCore;
        private _editor;
        private _currentTab;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        updateEditionTool(): void;
        isObjectSupported(object: any): boolean;
        createUI(): void;
        addTool(tool: ICustomEditionTool): void;
    }
}
