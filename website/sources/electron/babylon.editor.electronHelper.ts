module BABYLON.EDITOR {
    export class ElectronHelper {
        /**
        * Scene file
        */
        public static ReloadSceneOnFileChanged: boolean = false;
        public static SceneFilename: string = "";

        /**
        * Creates "File" objects from filenames
        */
        public static CreateFilesFromFileNames(filenames: string[], isOpenScene: boolean, callback: (files: File[]) => void): void {
            var fs = require("fs");

            // Transform readed files as File
            var counter = 0;
            var files = [];
            var filesLength = filenames.length;
            
            var createFile = (filename: string, indice: number) => {
                return (err: any, data: Uint8Array) => {
                    if (!data)
                        return;
                        
                    // Create file
                    var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(Tools.NormalizeUri(filename)), {
                        type: Tools.GetFileType(Tools.GetFileExtension(filename))
                    });

                    files.push(file);

                    // If scene file, watch file
                    var extension = Tools.GetFileExtension(filename);
                    if (extension === "babylon" || extension === "obj" || extension === "stl") {
                        this.SceneFilename = filename;

                        fs.watch(filename, null, (event: any, modifiedFilename: string) => {
                            if (!this.ReloadSceneOnFileChanged)
                                return;

                            fs.readFile(filename, (err: any, data: Uint8Array) => {
                                var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                                    type: Tools.GetFileType(Tools.GetFileExtension(filename))
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
        }

        /**
        * Watchs the specified file
        */
        public static WatchFile(filename: string, callback: (file: File) => void): void {
            var fs = require("fs");

            fs.watch(filename, null, (event: any, modifiedFilename: string) => {
                fs.readFile(filename, (err: any, data: Uint8Array) => {
                    var file = new File([new Blob([data])], BABYLON.Tools.GetFilename(filename), {
                        type: Tools.GetFileType(Tools.GetFileExtension(filename))
                    });

                    callback(file);
                });
            });
        }

        /**
        * Creates a save dialog
        */
        public static CreateSaveDialog(title: string, path: string, extension: string, callback: (filename: string) => void): void {
            var dialog = require("electron").remote.dialog;
            var options: Electron.SaveDialogOptions = {
                title: title,
                defaultPath: path,
                filters: [{
                    name: "Babylon.js Editor Project",
                    extensions: []
                }],
                buttonLabel: ""
            };

            dialog.showSaveDialog(null, options, (filename: string) => {
                callback(filename);
            });
        }
    }
}
