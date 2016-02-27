var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Storage = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Storage(core) {
                // Public members
                this.core = null;
                // Initialize
                this.core = core;
            }
            // Creates folders
            Storage.prototype.createFolders = function (folders, parentFolder, success, failed) { };
            // Gets children files
            Storage.prototype.getFiles = function (folder, success, failed) { };
            // Create files
            Storage.prototype.createFiles = function (files, folder, success, failed) { };
            // Select folder
            Storage.prototype.selectFolder = function (success) { };
            return Storage;
        })();
        EDITOR.Storage = Storage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
