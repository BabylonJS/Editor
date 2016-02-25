declare module BABYLON.EDITOR {
    class SceneGraphTool implements ICustomUpdate, IEventReceiver {
        container: string;
        sidebar: GUI.GUIGraph;
        panel: GUI.IGUIPanel;
        private _core;
        private _editor;
        private _graphRootName;
        private _menuDeleteId;
        private _menuCloneId;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onPreUpdate(): void;
        onPostUpdate(): void;
        onEvent(event: Event): boolean;
        fillGraph(node?: Node, graphNodeID?: string): void;
        createUI(): void;
        private _getRootNodes(result, entities);
        private _getObjectIcon(node);
        private _modifyElement(node, parentNode, id?);
        private _ensureObjectDispose(object);
    }
}
