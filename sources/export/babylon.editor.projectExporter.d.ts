declare module BABYLON.EDITOR {
    class ProjectExporter {
        static ExportProject(core: EditorCore, requestMaterials?: boolean): string;
        private static _SerializeGlobalAnimations();
        private static _SerializeLensFlares(core);
        private static _SerializePostProcesses();
        private static _TraverseNodes(core, node, project);
        private static _RequestMaterial(core, project, material);
        private static _FillRootNodes(core, data, propertyPath);
    }
}
