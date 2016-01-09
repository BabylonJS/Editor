declare module BABYLON.EDITOR {
    class FilesInput extends BABYLON.FilesInput {
        constructor(core: EditorCore, sceneLoadedCallback: any, progressCallback: any, additionnalRenderLoopLogicCallback: any, textureLoadingCallback: any, startingProcessingFilesCallback: any);
        private static _callbackStart(core);
        private static _callback(callback, core, filesInput);
    }
}
