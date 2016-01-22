module BABYLON.EDITOR {
    interface IStorageExporterGrid extends GUI.IGridRowData {
        name: string;
        type: string;
    }

    export class StorageExporter implements IEventReceiver {
        // Public members
        public core: EditorCore;

        // Private members
        private _storage: OneDriveStorage;

        private _window: GUI.GUIWindow = null;
        private _filesList: GUI.GUIGrid<IStorageExporterGrid> = null;
        private _currentChildrenFolder: IStorageFile[] = null;
        private _currentFolder: IStorageFile = null;
        private _previousFolders: IStorageFile[] = null;
        private _onFolderSelected: (folder: IStorageFile, folderChildren: IStorageFile[]) => void = null;

        // Static members
        private static _projectFolder: IStorageFile = null;
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
            core.eventReceivers.push(this);

            this._storage = new BABYLON.EDITOR[storageType](this.core);
        }

        // On event received
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT && event.guiEvent.caller === this._filesList && event.guiEvent.eventType === GUIEventType.GRID_SELECTED) {
                var selected = this._filesList.getSelectedRows()[0];
                var current = this._filesList.getRow(selected);

                if (current.type === "folder") {
                    var folder = this._getFileFolder(current.name, "folder", this._currentChildrenFolder);
                    this._previousFolders.push(this._currentFolder);
                    this._updateFolderDialog(folder);
                }
                else if (current.type === "previous") {
                    var previousFolder = this._previousFolders.pop();
                    this._updateFolderDialog(previousFolder);
                }

                return true;
            }

            else if (event.eventType === EventType.GUI_EVENT && event.guiEvent.caller === this._window && event.guiEvent.eventType === GUIEventType.WINDOW_BUTTON_CLICKED) {
                var button = event.guiEvent.data;
                var selectedRows = this._filesList.getSelectedRows();

                if (button === "Choose" && this._currentFolder) {
                    this._storage.getFiles(this._currentFolder, (children: IStorageFile[]) => {
                        this._onFolderSelected(this._currentFolder, children);
                    });
                }

                this._window.close();

                return true;
            }

            return false;
        }

        // Creates a template
        public createTemplate(): void {
            this._openFolderDialog((folder: IStorageFile, folderChildren: IStorageFile[]) => {
                this._lockPanel("Creating Template...");

                StorageExporter._projectFolder = folder;
                StorageExporter._projectFolderChildren = folderChildren;

                this._storage.createFolders(["Materials", "Textures", "Loading", "Code"], folder, () => {
                    this._unlockPanel();
                });
            });
        }

        // Exports
        public export(): void {
            if (!StorageExporter._projectFolder) {
                this._openFolderDialog((folder: IStorageFile, folderChildren: IStorageFile[]) => {
                    StorageExporter._projectFolder = folder;
                    StorageExporter._projectFolderChildren = folderChildren;

                    this.export();
                });
            }

            this._lockPanel("Saving on OneDrive...");

            this._updateFileList(() => {
                var exporter = new Exporter(this.core);
                var files: IStorageUploadFile[] = [
                    { name: "scene.js", content: exporter.generateCode() }
                ];

                this._storage.createFiles(files, StorageExporter._projectFolder, () => {
                    this._unlockPanel();
                });
            });
        }

        // Returns the folder object from its name
        public getFolder(name: string): IStorageFile {
            return this._getFileFolder(name, "folder", StorageExporter._projectFolderChildren);
        }

        // Returns the file object from its name
        public getFile(name: string): IStorageFile {
            return this._getFileFolder(name, "file", StorageExporter._projectFolderChildren);
        }

        // Creates the UI dialog to choose folder
        private _openFolderDialog(success?: (folder: IStorageFile, folderChildren: IStorageFile[]) => void): void {
            this._onFolderSelected = success;

            var gridID = "BABYLON-STORAGE-EXPORTER-GRID";
            var gridDiv = GUI.GUIElement.CreateElement("div", gridID);

            // Window
            this._window = new GUI.GUIWindow("BABYLON-STORAGE-EXPORTER-WINDOW", this.core, "Choose folder...", gridDiv);
            this._window.modal = true;
            this._window.showMax = false;
            this._window.buttons = [
                "Choose",
                "Cancel"
            ];

            this._window.setOnCloseCallback(() => {
                this.core.removeEventReceiver(this);
                this._filesList.destroy();
            });

            this._window.buildElement(null);

            // Grid
            this._filesList = new GUI.GUIGrid<IStorageExporterGrid>(gridID, this.core);
            this._filesList.header = "Files and Folders";
            this._filesList.createColumn("name", "name", "80%");
            this._filesList.createColumn("type", "type", "20%");

            this._filesList.buildElement(gridID);

            // Finish
            this._previousFolders = [];
            this._updateFolderDialog();
        }

        // Gets a list of files and folders
        private _updateFolderDialog(folder: IStorageFile = null): void {
            this._filesList.lock("Loading...", true);
            this._filesList.clear();

            this._currentFolder = folder;
            this._filesList.addRow({
                name: "..",
                type: "previous",
                recid: 0
            });

            this._storage.getFiles(folder, (children: IStorageFile[]) => {

                this._currentChildrenFolder = children;

                for (var i = 0; i < children.length; i++) {
                    this._filesList.addRow({
                        name: children[i].name,
                        type: children[i].file.folder ? "folder" : "file",
                        recid: i + 1
                    });
                }

                this._filesList.unlock();
            }, () => {
                this._filesList.unlock();
            });
        }

        // Updates the file list
        private _updateFileList(onSuccess: () => void): void {
            // Update files list and create files
            this._storage.getFiles(StorageExporter._projectFolder, (children: IStorageFile[]) => {
                StorageExporter._projectFolderChildren = children;
                onSuccess();
            });
        }

        // Returns the appropriate child from its name and its type
        private _getFileFolder(name: string, type: string, files: IStorageFile[]): IStorageFile {
            for (var i = 0; i < files.length; i++) {
                if (files[i].file.name === name && files[i].file[type])
                    return files[i];
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