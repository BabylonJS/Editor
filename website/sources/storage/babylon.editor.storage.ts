module BABYLON.EDITOR {
    export interface IStorageFile {
        // File element
        file: OneDrive.IChildResult;

        // File name
        name: string;

        // File or folder path
        path?: string;
    }

    export interface IStorageUploadFile {
        // File content (string or directly array buffer)
        content: string | Uint8Array | ArrayBuffer;

        // File name
        name: string;

        // Parent folder
        parentFolder?: OneDrive.IChildResult;

        // The file type
        type?: string;

        // File location URL
        url?: string;
    }

    export interface IStorage {
        // Creates folders
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: () => void): void;

        // Gets children files
        getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;

        // Creates files
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
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
        public createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void): void
        { }

        // Gets children files
        public getFiles(folder: IStorageFile, success: (children: IStorageFile[]) => void, failed?: (message: string) => void): void
        { }

        // Create files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void, progress?: (count: number) => void): void
        { }

        // Select folder
        public selectFolder(success: (folder: IStorageFile) => void): void
        { }
    }
}
