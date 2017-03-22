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
                var _this = 
                // Initialize
                _super.call(this, core) || this;
                _this._editor = core.editor;
                // OAuth
                //var clientID = "000000004C18353E"; // editor.babylonjs.com
                var clientID = "0000000048182B1B";
                EDITOR.OAuthManager._URI = "https://login.live.com/oauth20_authorize.srf"
                    + "?client_id=" + clientID
                    + "&redirect_uri=" + EDITOR.Tools.GetBaseURL() + "redirect.html"
                    + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
                return _this;
            }
            // Creates folders
            OneDriveStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
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
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + parentFolder.file.id + "/children",
                            type: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({
                                "name": folders[i],
                                "folder": {},
                                "@name.conflictBehavior": "rename"
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
            OneDriveStorage.prototype.createFiles = function (files, folder, success, failed, progress) {
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
                        $.ajax({
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.file.id) + ":/" + files[i].name + ":/content",
                            processData: false,
                            data: files[i].content,
                            type: "PUT",
                            headers: {
                                "Authorization": "Bearer " + EDITOR.OAuthManager._TOKEN
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
            OneDriveStorage.prototype.getFiles = function (folder, success, failed) {
                EDITOR.OAuthManager._Login(this.core, function () {
                    $.ajax({
                        url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                        type: "GET",
                        headers: {
                            "Authorization": "Bearer " + EDITOR.OAuthManager._TOKEN
                        },
                        success: function (response) {
                            var children = [];
                            for (var i = 0; i < response.value.length; i++)
                                children.push({ file: response.value[i], name: response.value[i].name });
                            success(children);
                        },
                        error: function (err) {
                            var message = "BABYLON.EDITOR.OneDriveStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");
                            if (failed)
                                failed(message);
                            else
                                BABYLON.Tools.Error(message);
                        }
                    });
                });
            };
            return OneDriveStorage;
        }(EDITOR.Storage));
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.oneDriveStorage.js.map
