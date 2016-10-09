declare module BABYLON.EDITOR {
    class ActionsBuilderParametersEditor {
        private _core;
        private _container;
        private _guiElements;
        /**
        * Constructor
        * @param core: the editor core
        * @param containerID: the div container ID
        */
        constructor(core: EditorCore, containerID: string);
        drawProperties(data: IActionsBuilderData): void;
        private _createListOfElements(name, items?);
        private _createHeader(name, type);
        private _populateStringArray(array, values, property?);
        private _destroyGUIElements();
        private _getParameterType(entry, parameter);
        private _getEffectiveTarget(object, target);
    }
}
