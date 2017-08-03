declare module BABYLON.EDITOR {
    interface IActionsBuilderProperty {
        name: string;
        value: string;
        targetType?: string;
    }
    interface IActionsBuilderElement {
        type: number;
        name: string;
        properties: IActionsBuilderProperty[];
        comment?: string;
    }
    interface IActionsBuilderSerializationObject extends IActionsBuilderElement {
        children: IActionsBuilderSerializationObject[];
    }
    interface IActionsBuilderData {
        class: IDocEntry;
        data: IActionsBuilderElement;
    }
    enum EACTION_TYPE {
        TRIGGER = 0,
        ACTION = 1,
        CONTROL = 2,
    }
    class ActionsBuilder implements IEventReceiver, ITabApplication {
        private _core;
        private _object;
        private _babylonModule;
        private _actionsClasses;
        private _controlsClasses;
        private _containerElement;
        private _containerID;
        private _tab;
        private _layouts;
        private _toolbar;
        private _triggersList;
        private _actionsList;
        private _controlsList;
        private _graph;
        private _currentSelected;
        private _parametersEditor;
        private _currentNode;
        private _currentCopyNode;
        private static _ActionsBuilderInstance;
        private static _Classes;
        private static _ExcludedClasses;
        static GetInstance(core: EditorCore): ActionsBuilder;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: IEvent): boolean;
        /**
        * Disposes the application
        */
        dispose(): void;
        /**
        * Serializes the graph
        */
        serializeGraph(root?: IActionsBuilderSerializationObject, parent?: string): IActionsBuilderSerializationObject;
        /**
        * Deserializes the graph
        */
        deserializeGraph(data: IActionsBuilderSerializationObject, parent: string): void;
        /**
        * Creates the UI
        */
        private _createUI();
        private _onCopy();
        private _onPaste(parent?, createdParent?);
        private _configureUI();
        private _onRemoveNode(removeChildren);
        private _onObjectSelected();
        private _onSave();
        private _onListElementClicked(list);
        private _getNodeParametersClass(type, name);
        private _getNodeColor(type);
        private _getNodeTypeString(type);
        private _getNodeTypeEnum(type);
        private _onMouseUpOnGraph();
        private _configureActionsBuilderData(data, type);
        private _loadDefinitionsFile();
        private _getModule(name);
        private _getClasses(module, heritates?);
        private _getClass(classes, name);
    }
}
