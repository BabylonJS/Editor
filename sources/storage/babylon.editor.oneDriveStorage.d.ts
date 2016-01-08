declare module BABYLON.EDITOR {
    class OneDriveStorage extends Storage {
        private _editor;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void): void;
        selectFolder(success: (folder: IStorageFolder, folderChildren: IStorageFile[], canceled: boolean) => void): void;
        getFiles(folder: IStorageFolder, success?: (children: IStorageFile[]) => void): void;
    }
}
