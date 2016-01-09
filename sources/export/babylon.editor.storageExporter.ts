module BABYLON.EDITOR {
    export class StorageExporter {
        // Public members
        public core: EditorCore;

        // Private members
        private _storage: OneDriveStorage;

        private static _projectFolder: IStorageFolder = null;
        private static _projectFolderChildren: IStorageFile[] = null;

        // Static members
        public static get OneDriveStorage(): string {
            return "OneDriveStorage";
        }

        /**
        * Constructor
        */
        constructor(core: EditorCore, storageType: string = StorageExporter.OneDriveStorage) {
            // Initialize
            this.core = core;

            this._storage = new BABYLON.EDITOR[storageType](this.core);
        }

        // Creates a template
        public createTemplate(): void {
            this._storage.selectFolder((folder: IStorageFolder, folderChildren: IStorageFile[], canceled: boolean) => {
                if (!canceled) {
                    this._lockPanel("Creating Template...");

                    StorageExporter._projectFolder = folder;
                    StorageExporter._projectFolderChildren = folderChildren;

                    this._storage.createFolders(["Materials", "Loading", "Code"], folder, () => {
                        this.core.editor.layouts.setPanelSize("bottom", 0);
                        this.core.editor.layouts.unlockPanel("bottom");
                    });
                }
                else {
                    this._unlockPanel();
                }
            });
        }

        // Exports
        public export(): void {

            if (!StorageExporter._projectFolder) {
                this._storage.selectFolder((folder: IStorageFolder, folderChildren: IStorageFile[], canceled: boolean) => {
                    if (!canceled) {
                        StorageExporter._projectFolder = folder;
                        StorageExporter._projectFolderChildren = folderChildren;
                    }
                });

                return;
            }

            this._lockPanel("Saving on OneDrive...");

            // Update files list and create files
            this._storage.getFiles(StorageExporter._projectFolder, (children: IStorageFile[]) => {
                StorageExporter._projectFolderChildren = children;

                var exporter = new Exporter(this.core);
                var files: IStorageUploadFile[] = [
                    { name: "scene.js", content: exporter.generateCode() },
                ];

                this._storage.createFiles(files, StorageExporter._projectFolder, () => {
                    this._unlockPanel();
                });
            });
        }

        // Returns the folder object from its name
        public getFolder(name: string): IStorageFile {
            return this._getFileFolder(name, "folder");
        }

        // Returns the file object from its name
        public getFile(name: string): IStorageFile {
            return this._getFileFolder(name, "file");
        }

        // Returns the appropriate child from its name and its type
        private _getFileFolder(name: string, type: string): IStorageFile {
            for (var i = 0; i < StorageExporter._projectFolderChildren.length; i++) {
                if (StorageExporter._projectFolderChildren[i].file.name === name && StorageExporter._projectFolderChildren[i].file.type === type)
                    return StorageExporter._projectFolderChildren[i];
            }

            return {
                file: null,
                name: ""
            };
        }

        // Locks the panel
        private _lockPanel(message: string): void {
            this.core.editor.layouts.setPanelSize("bottom", 0);
            this.core.editor.layouts.lockPanel("bottom", message, true);
        }

        // Unlocks the panel
        private _unlockPanel(): void {
            this.core.editor.layouts.setPanelSize("bottom", 0);
            this.core.editor.layouts.unlockPanel("bottom");
        }
    }
}