declare module BABYLON.EDITOR {
    class StorageExporter {
        core: EditorCore;
        private _storage;
        private static _projectFolder;
        private static _projectFolderChildren;
        static OneDriveStorage: string;
        /**
        * Constructor
        */
        constructor(core: EditorCore, storageType?: string);
        createTemplate(): void;
        export(): void;
        getFolder(name: string): IStorageFile;
        getFile(name: string): IStorageFile;
        private _getFileFolder(name, type);
        private _lockPanel(message);
        private _unlockPanel();
    }
}
