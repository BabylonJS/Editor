declare module BABYLON.EDITOR {
    class ActionsBuilder {
        private _core;
        private _babylonModule;
        private _containerID;
        private _tab;
        private _layouts;
        private _triggersList;
        private _actionsList;
        private _controlsList;
        private static _Classes;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore);
        /**
        * Creates the UI
        */
        private _createUI();
        private _loadDefinitionsFile();
        private _getModule(name);
        private _getClasses(module, heritates?);
    }
}
