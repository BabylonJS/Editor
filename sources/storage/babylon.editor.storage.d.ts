declare module BABYLON.EDITOR {
    interface IStorageFile {
        file: OneDrive.IChildResult;
        name: string;
    }
    interface IStorageUploadFile {
        content: string | Uint8Array;
        name: string;
        parentFolder?: OneDrive.IChildResult;
        type?: string;
        url?: string;
    }
    interface IStorage {
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: () => void): void;
        getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
    }
    class Storage implements IStorage {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        selectFolder(success: (folder: IStorageFile) => void): void;
    }
}
