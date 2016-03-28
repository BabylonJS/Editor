module BABYLON.EDITOR {
    export class OneDriveStorage extends Storage {
        // Public members

        // Private members
        private _editor: EditorMain;

        private static _ClientID = "0000000048182B1B";
        private static _TOKEN = "";
        private static _TOKEN_EXPIRES_IN = 0;
        private static _TOKEN_EXPIRES_NOW = 0;
        private static _POPUP: Window = null;

        // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
        private static _OnAuthentificated(): void {
            // Get token from URL
            var token = "";
            var expires = "";

            if (window.location.hash) {
                var response = window.location.hash.substring(1);
                var authInfo = JSON.parse("{\"" + response.replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (key, value) { return key === "" ? value : decodeURIComponent(value); });

                token = authInfo.access_token;
                expires = authInfo.expires_in;
            }

            // Close popup
            (<any>window).opener.BABYLON.EDITOR.OneDriveStorage._ClosePopup(token, expires, window);
        }

        // Closes the login popup
        private static _ClosePopup(token: string, expires: string, window: any): void {
            OneDriveStorage._TOKEN = token;

            if (token === "") {
                GUI.GUIWindow.CreateAlert("Cannot connect to OneDrive or get token...");
            }
            else {
                OneDriveStorage._TOKEN_EXPIRES_IN = parseInt(expires);
                OneDriveStorage._TOKEN_EXPIRES_NOW = Date.now();
            }

            if (window.OneDriveStorageCallback) {
                window.OneDriveStorageCallback();
            }

            window.close();
        }

        // Login into OneDrive
        private static _Login(core: EditorCore, success: () => void): void {
            // OneDrive
            var now = (Date.now() - OneDriveStorage._TOKEN_EXPIRES_NOW) / 1000;
            
            if (OneDriveStorage._TOKEN === "" || now >= OneDriveStorage._TOKEN_EXPIRES_IN) {
                var uri = "https://login.live.com/oauth20_authorize.srf"
                    + "?client_id=" + OneDriveStorage._ClientID
                    + "&redirect_uri=" + Tools.getBaseURL() + "redirect.html"
                    + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";

                var popup = Tools.OpenWindowPopup(uri, 512, 512);
                popup.OneDriveStorageCallback = success;
            }
            else {
                success();
            }
        }

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore)
        {
            super(core);

            this._editor = core.editor;

            // OneDrive
            /*
            if (OneDriveStorage._TOKEN === "") {
                var uri = "https://login.live.com/oauth20_authorize.srf"
                    + "?client_id=" + OneDriveStorage._ClientID
                    //+ "&redirect_uri=" + "http://localhost:33404/website/redirect.html"//window.location.href
                    + "&redirect_uri=" + Tools.getBaseURL() + "redirect.html"
                    + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite onedrive.appfolder wl.offline_access";
                
                Tools.OpenWindowPopup(uri, 512, 512);
            }
            */
        }

        // Creates folders
        public createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void) {
            OneDriveStorage._Login(this.core, () => {
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
                            "Authorization": "Bearer " + OneDriveStorage._TOKEN
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
        public createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void {
            OneDriveStorage._Login(this.core, () => {
                var count = 0;
                var error = "";

                var callback = () => {
                    count++;
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
                            "Authorization": "Bearer " + OneDriveStorage._TOKEN
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
            OneDriveStorage._Login(this.core, () => {
                $.ajax({
                    url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                    type: "GET",

                    headers: {
                        "Authorization": "Bearer " + OneDriveStorage._TOKEN
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