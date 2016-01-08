declare module BABYLON.EDITOR {
    interface IStorageFolder {
        folder: Microsoft.Live.IFolder;
        name: string;
    }
    interface IStorageFile {
        file: Microsoft.Live.IFile;
        name: string;
    }
    interface IStorageUploadFile {
        content: string;
        name: string;
        parentFolder?: Microsoft.Live.IFile;
    }
    interface IStorage {
        createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void): void;
        getFiles(folder: IStorageFolder, success: (children: IStorageFile[]) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void): void;
        selectFolder(success: (folder: IStorageFolder, childrenFolders: IStorageFile[]) => void): void;
    }
    class Storage implements IStorage {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void): void;
        getFiles(folder: IStorageFolder, success: (children: IStorageFile[]) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void): void;
        selectFolder(success: (folder: IStorageFolder) => void): void;
    }
}
