module BABYLON.EDITOR {
    export class OneDriveStorage extends Storage {
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
            var clientID = "000000004C18353E"; // editor.babylonjs.com
            //var clientID = "0000000048182B1B";
            OAuthManager._URI = "https://login.live.com/oauth20_authorize.srf"
                    + "?client_id=" + clientID
                    + "&redirect_uri=" + Tools.GetBaseURL() + "redirect.html"
                    + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
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
                        url: "https://Api.Onedrive.com/v1.0/drive/items/" + parentFolder.file.id + "/children",
                        type: "POST",
                        contentType: "application/json",

                        data: JSON.stringify({
                            "name": folders[i],
                            "folder": {},
                            "@name.conflictBehavior": "rename"
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
                    $.ajax({
                        url: "https://Api.Onedrive.com/v1.0/drive/items/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.file.id) + ":/" + files[i].name + ":/content",
                        processData: false,
                        data: files[i].content,
                        type: "PUT",

                        headers: {
                            "Authorization": "Bearer " + OAuthManager._TOKEN
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
                    url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                    type: "GET",

                    headers: {
                        "Authorization": "Bearer " + OAuthManager._TOKEN
                    },

                    success: (response: OneDrive.IChildrenResult) => {
                        var children: IStorageFile[] = [];

                        for (var i = 0; i < response.value.length; i++)
                            children.push({ file: response.value[i], name: response.value[i].name });

                        success(children);
                    },
                    error: (err: any) => {
                        var message = "BABYLON.EDITOR.OneDriveStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");

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