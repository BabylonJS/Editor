declare module BABYLON.EDITOR {
    class ScenarioMaker {
        private _core;
        private _containerID;
        private _tab;
        private _layouts;
        private _modulesGraph;
        private static _Definitions;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore);
        /**
        * Parses the babylon file
        */
        private _parseFile(data);
        /**
        * Creates the UI
        */
        private _createUI();
    }
}
