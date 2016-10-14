declare module BABYLON.EDITOR {
    class ActionsBuilderParametersEditor {
        onSave: () => void;
        onRemove: () => void;
        onRemoveAll: () => void;
        private _core;
        private _container;
        private _guiElements;
        private _currentTarget;
        /**
        * Constructor
        * @param core: the editor core
        * @param containerID: the div container ID
        */
        constructor(core: EditorCore, containerID: string);
        drawProperties(data: IActionsBuilderData): void;
        private _createField(property);
        private _createCheckbox(property, customText?);
        private _createListOfElements(property, items?, callback?);
        private _createHeader(name, type);
        private _populateStringArray(array, values, property?);
        private _destroyGUIElements();
        private _getParameterType(entry, parameter);
        private _getEffectiveTarget(object, target);
        private _createPropertyPath(node, properties?);
        private _createSoundsList();
    }
}
