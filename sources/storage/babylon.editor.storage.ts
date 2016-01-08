module BABYLON.EDITOR {
    export interface IStorageFolder {
        // Folder element
        folder: Microsoft.Live.IFolder;

        // Folder name
        name: string;
    }

    export interface IStorageFile {
        // File element
        file: Microsoft.Live.IFile;

        // File name
        name: string;
    }

    export interface IStorageUploadFile {
        // File content
        content: string;

        // File name
        name: string;

        // Parent folder
        parentFolder?: Microsoft.Live.IFile;
    }

    export interface IStorage {
        // Creates folders
        createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void): void;

        // Gets children files
        getFiles(folder: IStorageFolder, success: (children: IStorageFile[]) => void): void;

        // Creates files
        createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void): void;

        // Select folder
        selectFolder(success: (folder: IStorageFolder, childrenFolders: IStorageFile[]) => void): void;
    }

    export class Storage implements IStorage {
        // Public members
        public core: EditorCore = null;

        // Private members

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this.core = core;
        }

        // Creates folders
        public createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void)
        { }

        // Gets children files
        public getFiles(folder: IStorageFolder, success: (children: IStorageFile[]) => void)
        { }

        // Create files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void)
        { }

        // Select folder
        public selectFolder(success: (folder: IStorageFolder) => void): void
        { }
    }
}
