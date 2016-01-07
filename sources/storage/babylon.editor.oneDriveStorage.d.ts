declare module BABYLON.EDITOR {
    interface OneDriveOpenOptions extends IStorageOpenOptions {
    }
    class OneDriveStorage implements IStorage {
        onLoadedCallback: (results: IStorageResults[]) => void;
        private _editor;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        save(files: string[], options?: IStorageSaveOptions): void;
        open(options?: OneDriveOpenOptions): void;
        private _downloadFiles(files, callback?);
        private _downloadFolders(folders);
    }
}
