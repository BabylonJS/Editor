var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ElectronHelper = (function () {
            function ElectronHelper() {
            }
            /**
            * Creates "File" objects from filenames
            */
            ElectronHelper.CreateFilesFromFileNames = function (filenames, isOpenScene, callback) {
                var _this = this;
                var fs = require("fs");
                // Transform readed files as File
                var counter = 0;
                var files = [];
                var filesLength = filenames.length;
                var createFile = function (filename, indice) {
                    return function (err, data) {
                        if (!data)
                            return;
                        // Create file
                        var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(EDITOR.Tools.NormalizeUri(filename)), {
                            type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                        });
                        files.push(file);
                        // If scene file, watch file
                        var extension = EDITOR.Tools.GetFileExtension(filename);
                        if (extension === "babylon" || extension === "obj" || extension === "stl" || extension === "gltf") {
                            _this.SceneFilename = filename;
                            fs.watch(filename, null, function (event, modifiedFilename) {
                                if (!_this.ReloadSceneOnFileChanged)
                                    return;
                                fs.readFile(filename, function (err, data) {
                                    var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                                        type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                                    });
                                    files[indice] = file;
                                    callback(files);
                                });
                            });
                        }
                        // If finished, call the callback
                        counter++;
                        if (counter === filesLength) {
                            callback(files);
                        }
                    };
                };
                // Read files
                for (var i = 0; i < filenames.length; i++) {
                    fs.readFile(filenames[i], createFile(filenames[i], i));
                }
            };
            /**
            * Watchs the specified file
            */
            ElectronHelper.WatchFile = function (filename, callback) {
                var fs = require("fs");
                fs.watch(filename, null, function (event, modifiedFilename) {
                    fs.readFile(filename, function (err, data) {
                        var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                            type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                        });
                        callback(file);
                    });
                });
            };
            /**
            * Creates a save dialog
            */
            ElectronHelper.CreateSaveDialog = function (title, path, extension, callback) {
                var dialog = require("electron").remote.dialog;
                var options = {
                    title: title,
                    defaultPath: path,
                    filters: [{
                            name: "Babylon.js Editor Project",
                            extensions: []
                        }],
                    buttonLabel: ""
                };
                dialog.showSaveDialog(null, options, function (filename) {
                    callback(filename);
                });
            };
            return ElectronHelper;
        }());
        /**
        * Scene file
        */
        ElectronHelper.ReloadSceneOnFileChanged = false;
        ElectronHelper.SceneFilename = "";
        EDITOR.ElectronHelper = ElectronHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.electronHelper.js.map
