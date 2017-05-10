declare module BABYLON.EDITOR {
    class StorageExporter implements IEventReceiver {
        core: EditorCore;
        private _storage;
        private _window;
        private _filesList;
        private _currentChildrenFolder;
        private _currentFolder;
        private _previousFolders;
        private _onFolderSelected;
        private _statusBarId;
        private static _ProjectFolder;
        private static _ProjectFolderChildren;
        private static _IsWindowOpened;
        static readonly OneDriveStorage: string;
        static readonly DropBoxStorage: string;
        /**
        * Constructor
        */
        constructor(core: EditorCore, storageType?: string);
        onEvent(event: Event): boolean;
        createTemplate(): void;
        export(): void;
        private _createTemplate(config);
        private _fileExists(files, name, parent?);
        private _processIndexHTML(project, content);
        private _openFolderDialog(success?);
        private _updateFolderDialog(folder?);
        private _updateFileList(onSuccess);
        private _getFileFolder(name, type, files);
        getFolder(name: string): IStorageFile;
        getFile(name: string): IStorageFile;
    }
}
