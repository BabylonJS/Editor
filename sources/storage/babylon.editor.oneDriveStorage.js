var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OneDriveStorage = (function (_super) {
            __extends(OneDriveStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function OneDriveStorage(core) {
                _super.call(this, core);
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
            OneDriveStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                var _this = this;
                var count = 0;
                WL.login({
                    scope: "wl.skydrive_update"
                }).then(function (response) {
                    // Create folders
                    for (var i = 0; i < folders.length; i++) {
                        WL.api({
                            path: parentFolder.folder.id,
                            method: "POST",
                            body: {
                                "name": folders[i],
                                "description": "Babylon.js Editor Template Folder"
                            }
                        }).then(function (response) {
                            count++;
                            if (count === folders.length) {
                                success();
                            }
                        }, function (response) {
                            var errorDialog = new EDITOR.GUI.GUIDialog("ErrorDialog", _this.core, "Error when creating template", response.error.message);
                            errorDialog.buildElement(null);
                        });
                    }
                });
            };
            // Creates files
            OneDriveStorage.prototype.createFiles = function (files, folder, success, failed) {
                var count = 0;
                WL.login({ scope: "wl.skydrive_update" }).then(function (response) {
                    // Create files
                    for (var i = 0; i < files.length; i++) {
                        // Create the request on the fly (using jQuery)
                        var request = "--A300x\r\n"
                            + "Content-Disposition: form-data; name=\"file\"; filename=\"" + files[i].name + "\"\r\n"
                            + "Content-Type: application/octet-stream\r\n"
                            + "\r\n"
                            + "" + files[i].content + "\r\n"
                            + "\r\n"
                            + "--A300x--\r\n";
                        // Build url (until 1 level of folders, check parentFolder else projectFolder)
                        var url = "https://apis.live.net/v5.0/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.folder.id);
                        // Request
                        $.ajax({
                            type: "POST",
                            contentType: "multipart/form-data; boundary=A300x",
                            processData: false,
                            url: url + "/files?access_token=" + WL.getSession().access_token,
                            data: request,
                            success: function () {
                                count++;
                                if (count === files.length) {
                                    success();
                                }
                            },
                            error: function (err) {
                                BABYLON.Tools.Error("Cannot sync file");
                            }
                        });
                    }
                });
            };
            // Select folder
            OneDriveStorage.prototype.selectFolder = function (success) {
                var _this = this;
                WL.login({ scope: ["wl.signin", "wl.basic"] }).then(function (response) {
                    // Get selected folder
                    WL.fileDialog({ mode: "open", select: "multi" }).then(function (response) {
                        // Get children files
                        if (response.data.folders.length > 0) {
                            var folder = { folder: response.data.folders[0], name: response.data.folders[0].name };
                            _this.getFiles(folder, function (children) {
                                success(folder, children, false);
                            });
                        }
                        else {
                            success(null, null, true);
                        }
                    });
                });
            };
            // Gets the children files of a folder
            OneDriveStorage.prototype.getFiles = function (folder, success) {
                WL.login({ scope: ["wl.signin", "wl.basic"] }).then(function (response) {
                    // Get files
                    WL.api({
                        path: folder.folder.id + "/files",
                        method: "GET"
                    }).then(function (childrenResponse) {
                        var children = [];
                        for (var i = 0; i < childrenResponse.data.length; i++)
                            children.push({ file: childrenResponse.data[i], name: childrenResponse.data[i].name });
                        success(children);
                    });
                });
            };
            return OneDriveStorage;
        })(EDITOR.Storage);
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.oneDriveStorage.js.map