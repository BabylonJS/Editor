declare module BABYLON.EDITOR {
    class ActionsBuilder implements IEventReceiver, ITabApplication {
        private _core;
        private _babylonModule;
        private _containerID;
        private _tab;
        private _layouts;
        private _triggersList;
        private _actionsList;
        private _controlsList;
        private _graph;
        private _currentSelected;
        private static _Classes;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore);
        onEvent(event: IEvent): boolean;
        /**
        * Disposes the application
        */
        dispose(): void;
        /**
        * Creates the UI
        */
        private _createUI();
        private _configureUI();
        private _onListElementClicked(list);
        private _onMouseUpOnGraph();
        private _loadDefinitionsFile();
        private _getModule(name);
        private _getClasses(module, heritates?);
    }
}
