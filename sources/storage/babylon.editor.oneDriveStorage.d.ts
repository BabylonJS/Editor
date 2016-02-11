declare module BABYLON.EDITOR {
    class OneDriveStorage extends Storage {
        private _editor;
        private static _ClientID;
        private static _TOKEN;
        private static _TOKEN_EXPIRES_IN;
        private static _TOKEN_EXPIRES_NOW;
        private static _POPUP;
        private static _OnAuthentificated();
        private static _ClosePopup(token, expires, window);
        private static _Login(core, success);
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
