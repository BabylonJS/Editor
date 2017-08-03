declare module BABYLON.EDITOR {
    class ProjectExporter {
        static ExportProject(core: EditorCore, requestMaterials?: boolean): string;
        private static _SerializeGlobalAnimations();
        private static _SerializeSounds(core);
        private static _SerializeRenderTargets(core);
        private static _SerializeLensFlares(core);
        private static _SerializePostProcesses();
        private static _TraverseNodes(core, node, project);
        private static _SerializeActionManager(object);
        private static _SerializeCustomMetadatas(core);
        private static _Serialize2d(core);
        private static _RequestMaterial(core, project, material);
        private static _GetSerializedMaterial(project, materialName);
        private static _ConfigureMaterial(material, projectMaterial);
        private static _ConfigureBase64Texture(source, objectToConfigure);
        private static _FillRootNodes(core, data, propertyPath);
    }
}
