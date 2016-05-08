var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Storage = (function () {
            function Storage(core) {
                this.core = null;
                this.core = core;
            }
            Storage.prototype.createFolders = function (folders, parentFolder, success, failed) { };
            Storage.prototype.getFiles = function (folder, success, failed) { };
            Storage.prototype.createFiles = function (files, folder, success, failed) { };
            Storage.prototype.selectFolder = function (success) { };
            return Storage;
        }());
        EDITOR.Storage = Storage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
