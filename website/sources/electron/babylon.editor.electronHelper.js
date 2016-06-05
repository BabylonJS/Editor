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
                        // Create file
                        if (data) {
                            var blob = new Blob([data]);
                            var file = new File([blob], BABYLON.Tools.GetFilename(filename), {
                                type: EDITOR.Tools.GetFileType(EDITOR.Tools.GetFileExtension(filename))
                            });
                            files.push(file);
                        }
                        // If scene file, watch file
                        var extension = EDITOR.Tools.GetFileExtension(filename);
                        if (extension === "babylon" || extension === "obj" || extension === "stl") {
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
            * Scene file
            */
            ElectronHelper.ReloadSceneOnFileChanged = false;
            return ElectronHelper;
        }());
        EDITOR.ElectronHelper = ElectronHelper;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
