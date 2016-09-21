var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronLocalExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ElectronLocalExporter(core) {
                var _this = this;
                // Initialize
                this._core = core;
                // Save...
                var filename = EDITOR.ElectronHelper.SceneFilename === "" ? "scene" : EDITOR.Tools.GetFilenameWithoutExtension(EDITOR.ElectronHelper.SceneFilename, true) + ".editorproject";
                if (ElectronLocalExporter._LocalFilename === "") {
                    EDITOR.ElectronHelper.CreateSaveDialog("Save Project", filename, ".editorproject", function (filename) {
                        if (filename === undefined)
                            return;
                        ElectronLocalExporter._LocalFilename = filename;
                        _this.writeProject(filename);
                    });
                }
                else
                    this.writeProject(filename);
            }
            // Write project into local file
            ElectronLocalExporter.prototype.writeProject = function (filename) {
                var _this = this;
                this._core.editor.layouts.lockPanel("bottom", "Saving...", true);
                var fs = require('fs');
                var project = EDITOR.ProjectExporter.ExportProject(this._core, true);
                fs.writeFile(filename, project, function (error) {
                    console.log(error);
                    _this._core.editor.layouts.unlockPanel("bottom");
                });
            };
            // Static members
            ElectronLocalExporter._LocalFilename = "";
            return ElectronLocalExporter;
        }());
        EDITOR.ElectronLocalExporter = ElectronLocalExporter;
        var ElectronLocalStorage = (function (_super) {
            __extends(ElectronLocalStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ElectronLocalStorage(core) {
                _super.call(this, core);
                this._editor = core.editor;
            }
            // Creates folders
            ElectronLocalStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                var fs = require('fs');
                fs.readdir(parentFolder.name, function (err, files) {
                    console.log(files);
                });
            };
            // Creates files
            ElectronLocalStorage.prototype.createFiles = function (files, folder, success, failed) {
            };
            // Gets the children files of a folder
            ElectronLocalStorage.prototype.getFiles = function (folder, success, failed) {
                var fs = require('fs');
                var path = (folder && folder.file ? folder.file.id : process.env.HOME || process.env.USERPROFILE) + "/";
                fs.readdir(path, null, function (err, files) {
                    if (err) {
                        failed(err.message);
                        return;
                    }
                    var children = [];
                    for (var i = 0; i < files.length; i++) {
                        var filePath = path + files[i];
                        var file = { id: filePath, name: files[i], folder: null };
                        if (fs.lstatSync(path).isDirectory()) {
                            file.folder = { name: filePath };
                        }
                        children.push({
                            file: file,
                            name: files[i]
                        });
                    }
                    success(children);
                });
            };
            return ElectronLocalStorage;
        }(EDITOR.Storage));
        EDITOR.ElectronLocalStorage = ElectronLocalStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
