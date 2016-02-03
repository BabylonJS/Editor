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
                if (OneDriveStorage._TOKEN === "") {
                    var uri = "https://login.live.com/oauth20_authorize.srf"
                        + "?client_id=" + OneDriveStorage._ClientID
                        + "&redirect_uri=" + "http://localhost:33404/website/redirect.html" //window.location.href
                        + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite onedrive.appfolder wl.offline_access";
                    EDITOR.Tools.OpenWindowPopup(uri, 512, 512);
                }
            }
            // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
            OneDriveStorage.OnAuthentificated = function () {
                // Get token from URL
                var token = "";
                if (window.location.hash) {
                    var response = window.location.hash.substring(1);
                    var authInfo = JSON.parse("{\"" + response.replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (key, value) { return key === "" ? value : decodeURIComponent(value); });
                    token = authInfo.access_token;
                }
                // Close popup
                window.opener.BABYLON.EDITOR.OneDriveStorage.ClosePopup(token, window);
            };
            // Closes the login popup
            OneDriveStorage.ClosePopup = function (token, window) {
                OneDriveStorage._TOKEN = token;
                if (token === "") {
                }
                window.close();
            };
            // Creates folders
            OneDriveStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                var count = 0;
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
                        success: function () {
                            count++;
                            if (count === folders.length) {
                                success();
                            }
                        },
                        error: function (err) {
                            BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot create folders (POST)");
                        }
                    });
                }
            };
            // Creates files
            OneDriveStorage.prototype.createFiles = function (files, folder, success, failed) {
                var count = 0;
                for (var i = 0; i < files.length; i++) {
                    $.ajax({
                        //url: "https://Api.Onedrive.com/v1.0/drive/items/EE516DDA62BD39D4!4993:/coucou.png:/content",
                        url: "https://Api.Onedrive.com/v1.0/drive/items/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.file.id) + ":/" + files[i].name + ":/content",
                        processData: false,
                        data: files[i].content,
                        type: "PUT",
                        headers: {
                            "Authorization": "Bearer " + OneDriveStorage._TOKEN
                        },
                        success: function () {
                            count++;
                            if (count === files.length) {
                                success();
                            }
                        },
                        error: function (err) {
                            BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot upload files (PUT) of " + folder.name);
                        }
                    });
                }
            };
            // Gets the children files of a folder
            OneDriveStorage.prototype.getFiles = function (folder, success, error) {
                $.ajax({
                    url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                    type: "GET",
                    headers: {
                        "Authorization": "Bearer " + OneDriveStorage._TOKEN
                    },
                    success: function (response) {
                        var children = [];
                        for (var i = 0; i < response.value.length; i++)
                            children.push({ file: response.value[i], name: response.value[i].name });
                        success(children);
                    },
                    error: function (err) {
                        var message = "BABYLON.EDITOR.OneDriveStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");
                        if (error)
                            error(message);
                        else
                            BABYLON.Tools.Error(message);
                    }
                });
            };
            OneDriveStorage._ClientID = "0000000048182B1B";
            OneDriveStorage._TOKEN = "";
            OneDriveStorage._POPUP = null;
            return OneDriveStorage;
        })(EDITOR.Storage);
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.oneDriveStorage.js.map