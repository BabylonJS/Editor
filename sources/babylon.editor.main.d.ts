declare module BABYLON.EDITOR {
    class EditorMain implements IDisposable, IEventReceiver {
        core: EditorCore;
        editionTool: EditionTool;
        sceneGraphTool: SceneGraphTool;
        mainToolbar: MainToolbar;
        container: string;
        antialias: boolean;
        options: any;
        layouts: GUI.IGUILayout;
        /**
        * Constructor
        */
        constructor(containerID: string, antialias?: boolean, options?: any);
        /**
        * Event receiver
        */
        onEvent(event: Event): boolean;
        /**
        * Creates the UI
        */
        private _createUI();
        /**
        * Creates the babylon engine
        */
        private _createBabylonEngine();
        /**
        * Simply update the scenes and updates
        */
        update(): void;
        dispose(): void;
    }
}
