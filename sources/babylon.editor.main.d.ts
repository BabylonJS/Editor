declare module BABYLON.EDITOR {
    class EditorMain implements IDisposable {
        core: EditorCore;
        editionTool: EditionTool;
        container: string;
        antialias: boolean;
        options: any;
        layouts: GUI.IGUILayout;
        /**
        * Constructor
        */
        constructor(containerID: string, antialias?: boolean, options?: any);
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
