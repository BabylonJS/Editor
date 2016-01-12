var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StorageExporter = (function () {
            /**
            * Constructor
            */
            function StorageExporter(core, storageType) {
                if (storageType === void 0) { storageType = StorageExporter.OneDriveStorage; }
                // Initialize
                this.core = core;
                this._storage = new BABYLON.EDITOR[storageType](this.core);
            }
            Object.defineProperty(StorageExporter, "OneDriveStorage", {
                // Static members
                get: function () {
                    return "OneDriveStorage";
                },
                enumerable: true,
                configurable: true
            });
            // Creates a template
            StorageExporter.prototype.createTemplate = function () {
                var _this = this;
                this._storage.selectFolder(function (folder, folderChildren, canceled) {
                    if (!canceled) {
                        _this._lockPanel("Creating Template...");
                        StorageExporter._projectFolder = folder;
                        StorageExporter._projectFolderChildren = folderChildren;
                        _this._storage.createFolders(["Materials", "Textures", "Loading", "Code"], folder, function () {
                            _this._unlockPanel();
                        });
                    }
                    else {
                        _this._unlockPanel();
                    }
                });
            };
            // Exports
            StorageExporter.prototype.export = function () {
                var _this = this;
                if (!StorageExporter._projectFolder) {
                    this._storage.selectFolder(function (folder, folderChildren, canceled) {
                        if (!canceled) {
                            StorageExporter._projectFolder = folder;
                            StorageExporter._projectFolderChildren = folderChildren;
                            _this.export();
                        }
                    });
                    return;
                }
                this._lockPanel("Saving on OneDrive...");
                // Update files list and create files
                this._updateFileList(function () {
                    var exporter = new EDITOR.Exporter(_this.core);
                    var files = [
                        { name: "scene.js", content: exporter.generateCode() },
                    ];
                    _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                        _this._unlockPanel();
                    });
                });
            };
            // Returns the folder object from its name
            StorageExporter.prototype.getFolder = function (name) {
                return this._getFileFolder(name, "folder");
            };
            // Returns the file object from its name
            StorageExporter.prototype.getFile = function (name) {
                return this._getFileFolder(name, "file");
            };
            // Updates the file list
            StorageExporter.prototype._updateFileList = function (onSuccess) {
                // Update files list and create files
                this._storage.getFiles(StorageExporter._projectFolder, function (children) {
                    StorageExporter._projectFolderChildren = children;
                    onSuccess();
                });
            };
            // Returns the appropriate child from its name and its type
            StorageExporter.prototype._getFileFolder = function (name, type) {
                for (var i = 0; i < StorageExporter._projectFolderChildren.length; i++) {
                    if (StorageExporter._projectFolderChildren[i].file.name === name && StorageExporter._projectFolderChildren[i].file.type === type)
                        return StorageExporter._projectFolderChildren[i];
                }
                return {
                    file: null,
                    name: ""
                };
            };
            // Locks the panel
            StorageExporter.prototype._lockPanel = function (message) {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.lockPanel("bottom", message, true);
            };
            // Unlocks the panel
            StorageExporter.prototype._unlockPanel = function () {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.unlockPanel("bottom");
            };
            StorageExporter._projectFolder = null;
            StorageExporter._projectFolderChildren = null;
            return StorageExporter;
        })();
        EDITOR.StorageExporter = StorageExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.storageExporter.js.map