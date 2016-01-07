module BABYLON.EDITOR {
    export interface OneDriveOpenOptions extends IStorageOpenOptions {

    }

    export class OneDriveStorage implements IStorage {
        // Public members
        public onLoadedCallback: (results: IStorageResults[]) => void = null;

        // Private members
        private _editor: EditorMain;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore)
        {
            this._editor = core.editor;

            // OneDrive
            WL.init({
                client_id: 'be23a466-1ef8-449b-8e6d-0ad6ca88e82f',
                redirect_uri: window.location.href,
                scope: ["wl.signin", "wl.basic"],
                response_type: "token"
            });
        }

        // Save files
        public save(files: string[], options?: IStorageSaveOptions): void {

        }

        // Open files
        public open(options?: OneDriveOpenOptions): void {
            WL.login({ scope: ["wl.signin", "wl.basic"] }).then((response: Microsoft.Live.ILoginStatus) => {
                WL.fileDialog({ mode: "open", select: "multi" }).then((response: Microsoft.Live.IFilePickerResult) => {
                    this._downloadFiles(response.data.files || [])();
                    this._downloadFolders(response.data.folders || [])();
                });
            });
        }

        // Download all files
        private _downloadFiles(files: Microsoft.Live.IFile[], callback?: (results: IStorageResults | { }) => void): () => void {
            var count = 0;
            var results: IStorageResults[] = [];

            return () => {
                for (var i = 0; i < files.length; i++) {
                    WL.api({
                        path: files[i].id + "/content"
                    }).then((response: Object) => {
                        count++;
                        results.push(response);

                        if (count >= files.length) {
                            if (callback) {
                                callback(results);
                            }
                            else if (this.onLoadedCallback) {
                                this.onLoadedCallback(results);
                            }
                        }
                    });
                }
            };
        };

        // Downloads all folders
        private _downloadFolders(folders: Microsoft.Live.IFolder[]): () => void {
            var count = 0;
            var results: IStorageResults[] = [];

            return () => {
                for (var i = 0; i < folders.length; i++) {
                    WL.api({
                        path: folders[i].id + "/files"
                    }).then((response: any) => {
                        count++;
                        results.push(response);

                        if (count >= folders.length) {
                            this._downloadFiles(response.data)();
                        }
                    });
                }
            };
        }
    }
}