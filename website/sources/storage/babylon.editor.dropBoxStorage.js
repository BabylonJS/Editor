var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var DropBoxStorage = (function (_super) {
            __extends(DropBoxStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function DropBoxStorage(core) {
                var _this = 
                // Initialize
                _super.call(this, core) || this;
                _this._editor = core.editor;
                // OAuth
                var clientID = "pn1wz1qwruoj648";
                EDITOR.OAuthManager._URI = "https://www.dropbox.com/1/oauth2/authorize"
                    + "?client_id=" + clientID
                    + "&redirect_uri=" + EDITOR.Tools.GetBaseURL() + "redirect.html"
                    + "&response_type=token";
                return _this;
            }
            // Creates folders
            DropBoxStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                EDITOR.OAuthManager._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
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
                                "Authorization": "Bearer " + EDITOR.OAuthManager._TOKEN
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot create folders (POST)");
                            }
                        });
                    }
                });
            };
            // Creates files
            DropBoxStorage.prototype.createFiles = function (files, folder, success, failed, progress) {
                EDITOR.OAuthManager._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
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
                                "Authorization": "Bearer " + EDITOR.OAuthManager._TOKEN,
                                "Content-Type": "application/octet-stream",
                                "Dropbox-API-Arg": JSON.stringify({
                                    "path": path,
                                    "mode": {
                                        ".tag": "overwrite"
                                    },
                                    "autorename": false
                                })
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot upload files (PUT) of " + folder.name);
                            }
                        });
                    }
                });
            };
            // Gets the children files of a folder
            DropBoxStorage.prototype.getFiles = function (folder, success, failed) {
                EDITOR.OAuthManager._Login(this.core, function () {
                    $.ajax({
                        url: "https://api.dropboxapi.com/2/files/list_folder",
                        type: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({
                            path: folder ? folder.path : ""
                        }),
                        headers: {
                            "Authorization": "Bearer " + EDITOR.OAuthManager._TOKEN
                        },
                        success: function (response) {
                            var children = [];
                            for (var i = 0; i < response.entries.length; i++) {
                                var entry = response.entries[i];
                                var file = { id: entry.id, name: entry.name, folder: null };
                                if (entry.size === undefined)
                                    file.folder = { name: entry.name };
                                children.push({ file: file, name: entry.name, path: entry.path_display });
                            }
                            success(children);
                        },
                        error: function (err) {
                            var message = "BABYLON.EDITOR.DropBoxStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");
                            if (failed)
                                failed(message);
                            else
                                BABYLON.Tools.Error(message);
                        }
                    });
                });
            };
            return DropBoxStorage;
        }(EDITOR.Storage));
        EDITOR.DropBoxStorage = DropBoxStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.dropBoxStorage.js.map
