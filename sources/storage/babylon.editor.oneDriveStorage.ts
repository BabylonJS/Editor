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
            super(core);

            this._editor = core.editor;

            // OneDrive
            WL.init({
                client_id: 'be23a466-1ef8-449b-8e6d-0ad6ca88e82f',
                redirect_uri: window.location.href,
                scope: ["wl.signin", "wl.basic"],
                response_type: "token"
            });
        }

        // Creates folders
        public createFolders(folders: string[], parentFolder: IStorageFolder, success?: () => void, failed?: () => void) {
            var count = 0;

            WL.login({
                scope: "wl.skydrive_update"
            }).then((response: Microsoft.Live.ILoginStatus) => {
                // Create folders
                for (var i = 0; i < folders.length; i++) {
                    WL.api({
                        path: parentFolder.folder.id,
                        method: "POST",
                        body: {
                            "name": folders[i],
                            "description": "Babylon.js Editor Template Folder"
                        }
                    }).then(
                        (response: any) => {
                            count++;

                            if (count === folders.length) {
                                success();
                            }
                        },
                        (response: any) => {
                            var errorDialog = new GUI.GUIDialog("ErrorDialog", this.core, "Error when creating template", response.error.message);
                            errorDialog.buildElement(null);
                        }
                    );
                }
            });
        }

        // Creates files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFolder, success?: () => void, failed?: () => void) {
            var count = 0;

            WL.login({
                scope: "wl.skydrive_update"
            }).then((response: Microsoft.Live.ILoginStatus) => {

                for (var i = 0; i < files.length; i++) {
                    var request = "--A300x\r\n"
                        + "Content-Disposition: form-data; name=\"file\"; filename=\"" + files[i].name + "\"\r\n"
                        + "Content-Type: application/octet-stream\r\n"
                        + "\r\n"
                        + "" + files[i].content + "\r\n"
                        + "\r\n"
                        + "--A300x--\r\n";
                    var url = "https://apis.live.net/v5.0/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.folder.id);

                    $.ajax({
                        type: "POST",
                        contentType: "multipart/form-data; boundary=A300x",
                        processData: false,
                        url: url + "/files?access_token=" + WL.getSession().access_token,
                        data: request,
                        success: () => {
                            count++;

                            if (count === files.length) {
                                success();
                            }
                        },
                        error: (err: any) => {
                            BABYLON.Tools.Error("Cannot sync file");
                        }
                    });
                }

            });
        }

        // Select folder
        public selectFolder(success: (folder: IStorageFolder, folderChildren: IStorageFile[], canceled: boolean) => void): void {
            WL.login({ scope: ["wl.signin", "wl.basic"] }).then((response: Microsoft.Live.ILoginStatus) => {
                // Get selected folder
                WL.fileDialog({ mode: "open", select: "multi" }).then((response: Microsoft.Live.IFilePickerResult) => {

                    // Get children files
                    if (response.data.folders.length > 0) {
                        var folder = { folder: response.data.folders[0], name: response.data.folders[0].name }

                        this.getFiles(folder, (children: IStorageFile[]) => {
                            success(folder, children, false);
                        });
                    }
                    else {
                        success(null, null, true);
                    }
                });
            });
        }

        // Gets the children files of a folder
        public getFiles(folder: IStorageFolder, success?: (children: IStorageFile[]) => void) {
            WL.api({
                path: folder.folder.id + "/files",
                method: "GET"
            }).then(
                (childrenResponse: { data: Microsoft.Live.IFile[] }) => {

                    var children: IStorageFile[] = [];

                    for (var i = 0; i < childrenResponse.data.length; i++)
                        children.push({ file: childrenResponse.data[i], name: childrenResponse.data[i].name });

                    success(children);

                }
            );
        }
    }
}