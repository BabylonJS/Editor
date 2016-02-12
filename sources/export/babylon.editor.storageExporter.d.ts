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
        private static _projectFolder;
        private static _projectFolderChildren;
        static OneDriveStorage: string;
        /**
        * Constructor
        */
        constructor(core: EditorCore, storageType?: string);
        onEvent(event: Event): boolean;
        createTemplate(): void;
        export(): void;
        getFolder(name: string): IStorageFile;
        getFile(name: string): IStorageFile;
        private _createTemplate();
        private _fileExists(files, name, parent?);
        private _processIndexHTML(project, content);
        private _openFolderDialog(success?);
        private _updateFolderDialog(folder?);
        private _updateFileList(onSuccess);
        private _getFileFolder(name, type, files);
        private _lockPanel(message);
        private _unlockPanel();
    }
}
