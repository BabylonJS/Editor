declare module BABYLON.EDITOR {
    class BabylonExporter implements IEventReceiver {
        private _core;
        private _window;
        private _layout;
        private _editor;
        private _configForm;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        createUI(): void;
        static GenerateFinalBabylonFile(core: EditorCore): any;
    }
}
