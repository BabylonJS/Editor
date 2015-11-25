declare module BABYLON.EDITOR {
    class SceneGraphTool implements ICustomUpdate, IEventReceiver {
        object: any;
        container: string;
        editionTools: Array<ICustomEditionTool>;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        isObjectSupported(object: any): boolean;
        createUI(): void;
    }
}
