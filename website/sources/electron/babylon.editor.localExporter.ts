module BABYLON.EDITOR {
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
            var fs = require("fs");
            var path = parentFolder.file.id + "/";

            for (var i = 0; i < folders.length; i++) {
                try {
                    var stat = fs.lstatSync(path + folders[i]);
                    if (stat.isDirectory())
                        continue;
                }
                catch (e) {
                    // Catch silently...
                }

                fs.mkdirSync(path + folders[i]);
            }

            success();
        }

        // Creates files
        public createFiles(files: IStorageUploadFile[], folder: IStorageFile, success?: () => void, failed?: (message: string) => void): void {
            var fs = require("fs");
            var path = folder.file.id + "/";

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var filePath = (file.parentFolder ? file.parentFolder.id + "/" : path) + file.name;
                var data: string | ArrayBuffer = null;

                if (file.content instanceof ArrayBuffer)
                    data = new global.Buffer(<Uint8Array>file.content);
                else
                    data = file.content;

                fs.writeFileSync(filePath, data);
            }

            success();
        }

        // Gets the children files of a folder
        public getFiles(folder: IStorageFile, success?: (children: IStorageFile[]) => void, failed?: (message: string) => void): void {
            var fs = require("fs");
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