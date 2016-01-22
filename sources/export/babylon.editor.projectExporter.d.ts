declare module BABYLON.EDITOR {
    class ProjectExporter {
        private _core;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        exportProject(): string;
        private _serializeGlobalAnimations();
        private _traverseNodes(node, project);
        private _fillRootNodes(data, propertyPath);
    }
}
