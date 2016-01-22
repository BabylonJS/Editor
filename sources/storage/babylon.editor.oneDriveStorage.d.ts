declare module BABYLON.EDITOR {
    class OneDriveStorage extends Storage {
        private _editor;
        private static _ClientID;
        private static _TOKEN;
        private static _POPUP;
        static OnAuthentificated(): void;
        static ClosePopup(token: string, window: Window): void;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: () => void): void;
        createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: () => void): void;
        getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, error?: (message: string) => void): void;
    }
}
