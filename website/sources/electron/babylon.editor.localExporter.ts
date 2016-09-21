module BABYLON.EDITOR {
    export class ElectronLocalExporter {
        // Public members

        // Private members
        private _core: EditorCore;

        // Static members
        private static _LocalFilename: string = "";

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            
            // Save...
            var filename = ElectronHelper.SceneFilename === "" ? "scene" : Tools.GetFilenameWithoutExtension(ElectronHelper.SceneFilename, true) + ".editorproject";

            if (ElectronLocalExporter._LocalFilename === "") {
                ElectronHelper.CreateSaveDialog("Save Project", filename, ".editorproject", (filename: string) => {
                    if (filename === undefined)
                        return;

                    ElectronLocalExporter._LocalFilename = filename;

                    this.writeProject(filename);
                });
            }
            else
                this.writeProject(filename);
        }

        // Write project into local file
        public writeProject(filename: string): void {
            this._core.editor.layouts.lockPanel("bottom", "Saving...", true);

            var fs = require('fs');
            var project = ProjectExporter.ExportProject(this._core, true);

            fs.writeFile(filename, project, (error: string) => {
                console.log(error);

                this._core.editor.layouts.unlockPanel("bottom");
            });
        }
    }

    export class ElectronLocalStorage extends Storage {
        // Public members

        // Private members
        private _editor: EditorMain;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            super(core);

            this._editor = core.editor;
        }

        // Creates folders
        public createFolders(folders: string[], parentFolder: IStorageFile, success?: () => void, failed?: (message: string) => void) {
            var fs = require('fs');

            fs.readdir(parentFolder.name, (err, files) => {
                console.log(files);
            });
        }

        // Creates files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void {

        }

        // Gets the children files of a folder
        public getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, failed?: (message: string) => void): void {
            var fs = require('fs');
            var path = (folder && folder.file ? folder.file.id : process.env.HOME || process.env.USERPROFILE) + "/";

            fs.readdir(path, null, (err, files: string[]) => {
                if (err) {
                    failed(err.message);
                    return;
                }

                var children: IStorageFile[] = [];

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
        }
    }
}