var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
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
                var fs = require("fs");
                var path = parentFolder.file.id + "/";
                for (var i = 0; i < folders.length; i++) {
                    try {
                        var stat = fs.lstatSync(path + folders[i]);
                        if (stat.isDirectory())
                            continue;
                    }
                    catch (e) {
                    }
                    fs.mkdirSync(path + folders[i]);
                }
                success();
            };
            // Creates files
            ElectronLocalStorage.prototype.createFiles = function (files, folder, success, failed, progress) {
                var fs = require("fs");
                var path = folder.file.id + "/";
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var filePath = (file.parentFolder ? file.parentFolder.id + "/" : path) + file.name;
                    var data = null;
                    if (file.content instanceof ArrayBuffer || file.content instanceof Uint8Array)
                        data = new global.Buffer(file.content);
                    else
                        data = file.content;
                    fs.writeFileSync(filePath, data);
                    if (progress)
                        progress(i);
                }
                success();
            };
            // Gets the children files of a folder
            ElectronLocalStorage.prototype.getFiles = function (folder, success, failed) {
                var fs = require("fs");
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

//# sourceMappingURL=babylon.editor.localExporter.js.map
