declare module BABYLON.EDITOR {
    class ElectronLocalExporter {
        private _core;
        private static _LocalFilename;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        writeProject(filename: string): void;
    }
    class ElectronLocalStorage extends Storage {
        private _editor;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void;
        getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, failed?: (message: string) => void): void;
    }
}
