var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OneDriveStorage = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function OneDriveStorage(core) {
                // Public members
                this.onLoadedCallback = null;
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
            OneDriveStorage.prototype.save = function (files, options) {
            };
            // Open files
            OneDriveStorage.prototype.open = function (options) {
                var _this = this;
                WL.login({ scope: ["wl.signin", "wl.basic"] }).then(function (response) {
                    WL.fileDialog({ mode: "open", select: "multi" }).then(function (response) {
                        _this._downloadFiles(response.data.files || [])();
                        _this._downloadFolders(response.data.folders || [])();
                    });
                });
            };
            // Download all files
            OneDriveStorage.prototype._downloadFiles = function (files, callback) {
                var _this = this;
                var count = 0;
                var results = [];
                return function () {
                    for (var i = 0; i < files.length; i++) {
                        WL.api({
                            path: files[i].id + "/content"
                        }).then(function (response) {
                            count++;
                            results.push(response);
                            if (count >= files.length) {
                                if (callback) {
                                    callback(results);
                                }
                                else if (_this.onLoadedCallback) {
                                    _this.onLoadedCallback(results);
                                }
                            }
                        });
                    }
                };
            };
            ;
            // Downloads all folders
            OneDriveStorage.prototype._downloadFolders = function (folders) {
                var _this = this;
                var count = 0;
                var results = [];
                return function () {
                    for (var i = 0; i < folders.length; i++) {
                        WL.api({
                            path: folders[i].id + "/files"
                        }).then(function (response) {
                            count++;
                            results.push(response);
                            if (count >= folders.length) {
                                _this._downloadFiles(response.data)();
                            }
                        });
                    }
                };
            };
            return OneDriveStorage;
        })();
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.oneDriveStorage.js.map