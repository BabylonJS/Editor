module BABYLON.EDITOR {
    export class DropBoxStorage extends Storage {
        // Public members

        // Private members
        private _editor: EditorMain;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore)
        {
            // Initialize
            super(core);

            this._editor = core.editor;

            // OAuth
            var clientID = "pn1wz1qwruoj648";
            OAuthManager._URI = "https://www.dropbox.com/1/oauth2/authorize"
                    + "?client_id=" + clientID
                    + "&redirect_uri=" + Tools.GetBaseURL() + "redirect.html"
                    + "&response_type=token";
        }

        // Creates folders
        public createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void) {
            OAuthManager._Login(this.core, () => {
                var count = 0;
                var error = "";

                var callback = () => {
                    count++;
                    if (count === folders.length) {
                        if (error !== "" && failed) {
                            failed(error);
                        }
                        success();
                    }
                };

                for (var i = 0; i < folders.length; i++) {
                    $.ajax({
                        url: "https://api.dropboxapi.com/2/files/create_folder",
                        type: "POST",
                        contentType: "application/json",

                        data: JSON.stringify({
                            "path": parentFolder ? parentFolder.path + "/" + folders[i] : "/" + folders[i]
                        }),

                        headers: {
                            "Authorization": "Bearer " + OAuthManager._TOKEN
                        },

                        success: () => {
                            callback();
                        },
                        error: (err: any) => {
                            error += "- " + err.statusText + "\n";
                            callback();
                            BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot create folders (POST)");
                        }
                    });
                }
            });
        }

        // Creates files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void, progress?: (count: number) => void): void {
            OAuthManager._Login(this.core, () => {
                var count = 0;
                var error = "";

                var callback = () => {
                    count++;

                    if (progress)
                        progress(count);

                    if (count === files.length) {
                        if (error !== "" && failed) {
                            failed(error);
                        }
                        success();
                    }
                };

                for (var i = 0; i < files.length; i++) {
                    var content = files[i].content;
                    
                    var path = "";
                    if (folder)
                        path = folder.path;
                    
                    if (!files[i].parentFolder)
                        path += "/" + files[i].name;
                    else
                        path += "/" + files[i].parentFolder.name + "/" + files[i].name;

                    $.ajax({
                        url: "https://content.dropboxapi.com/2/files/upload",
                        processData: false,
                        contentType: "application/octet-stream",
                        data: content,
                        type: "POST",

                        headers: {
                            "Authorization": "Bearer " + OAuthManager._TOKEN,
                            "Content-Type": "application/octet-stream",
                            "Dropbox-API-Arg": JSON.stringify({
                                "path": path,
                                "mode": {
                                    ".tag": "overwrite"
                                },
                                "autorename": false
                            })
                        },

                        success: () => {
                            callback();
                        },
                        error: (err: any) => {
                            error += "- " + err.statusText + "\n";
                            callback();
                            BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot upload files (PUT) of " + folder.name);
                        }
                    });
                }
            });
        }

        // Gets the children files of a folder
        public getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, failed?: (message: string) => void): void {
            OAuthManager._Login(this.core, () => {
                $.ajax({
                    url: "https://api.dropboxapi.com/2/files/list_folder",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({
                        path: folder ? folder.path : ""
                    }),

                    headers: {
                        "Authorization": "Bearer " + OAuthManager._TOKEN
                    },

                    success: (response: DropBox.IFileList) => {
                        var children: IStorageFile[] = [];

                        for (var i = 0; i < response.entries.length; i++) {
                            var entry = response.entries[i];
                            var file = { id: entry.id, name: entry.name, folder: null };

                            if (entry.size === undefined)
                                file.folder = { name: entry.name };

                            children.push({ file: file, name: entry.name, path: entry.path_display });
                        }

                        success(children);
                    },
                    error: (err: any) => {
                        var message = "BABYLON.EDITOR.DropBoxStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");

                        if (failed)
                            failed(message);
                        else
                            BABYLON.Tools.Error(message);
                    }
                });
            });
        }
    }
}