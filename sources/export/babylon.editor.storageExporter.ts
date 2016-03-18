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

                this._storage.createFolders(["Materials", "Textures", "js", "Scene"], folder, () => {
                    this._createTemplate();
                }, () => {
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

                return;
            }

            this._lockPanel("Saving on OneDrive...");

            this._updateFileList(() => {
                var files: IStorageUploadFile[] = [
                    { name: "scene.editorproject", content: ProjectExporter.ExportProject(this.core) }
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

        // Creates the template with all files
        private _createTemplate(): void {
            this._updateFileList(() => {
                var files: IStorageUploadFile[] = [];

                var url = window.location.href;
                url = url.replace(BABYLON.Tools.GetFilename(url), "");

                var projectContent = ProjectExporter.ExportProject(this.core, true);
                var project: INTERNAL.IProjectRoot = JSON.parse(projectContent);

                var sceneFolder = this.getFolder("Scene");

                // Files already loaded
                //files.push({ name: "scene.js", content: projectContent });
                //files.push({ name: "template.js", content: Exporter.ExportCode(this.core), parentFolder: this.getFolder("js").file });

                var sceneToLoad: File = (<any>this.core.editor.filesInput)._sceneFileToLoad;
                files.push({ name: sceneToLoad.name, content: JSON.stringify(BabylonExporter.GenerateFinalBabylonFile(this.core)), parentFolder: sceneFolder.file });

                // Lens flare textures
                for (var i = 0; i < project.lensFlares.length; i++) {
                    var lf = project.lensFlares[i].serializationObject;

                    for (var j = 0; j < lf.flares.length; j++) {
                        if (!this._fileExists(files, lf.flares[j].base64Name, sceneFolder)) {
                            files.push({
                                name: lf.flares[j].base64Name,
                                content: Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer),
                                parentFolder: sceneFolder.file
                            });
                        }
                    }
                }

                // Particle system textures
                for (var i = 0; i < project.particleSystems.length; i++) {
                    var ps = project.particleSystems[i].serializationObject;
                    if (!this._fileExists(files, ps.base64TextureName, sceneFolder)) {
                        files.push({
                            name: ps.base64TextureName,
                            content: Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture),
                            parentFolder: sceneFolder.file
                        });
                    }
                }

                // Textures
                if (SceneFactory.HDRPipeline && SceneFactory.HDRPipeline.lensTexture) {
                    var lensTextureName = SceneFactory.HDRPipeline.lensTexture.name;
                    //files.push({ name: lensTextureName, url: url + "Textures/" + lensTextureName, content: null, parentFolder: this.getFolder("Textures").file, type: "arraybuffer" });
                    files.push({
                        name: lensTextureName,
                        content: Tools.ConvertBase64StringToArrayBuffer((<any>SceneFactory.HDRPipeline.lensTexture)._buffer),
                        parentFolder: this.getFolder("Textures").file
                    });
                }

                // Files to load
                var count = files.length;

                files.push({ name: "index.html", url: url + "templates/index.html", content: null });
                files.push({ name: "Web.config", url: url + "templates/Template.xml", content: null });
                files.push({ name: "babylon.js", url: url + "libs/babylon.js", content: null, parentFolder: this.getFolder("js").file });

                // Materials
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    var name = "babylon." + project.requestedMaterials[i] + ".js";
                    files.push({ name: name, url: url + "libs/materials/" + name, content: null, parentFolder: this.getFolder("Materials").file });
                }

                // Load files
                var loadCallback = (indice: number) => {
                    return (data: any) => {
                        count++;

                        if (indice >= 0) {
                            if (files[indice].name === "index.html") {
                                data = this._processIndexHTML(project, data);
                            }

                            files[indice].content = data;
                        }

                        if (count >= files.length) {
                            this._storage.createFiles(files, StorageExporter._projectFolder, () => {
                                this._unlockPanel();
                            }, () => {
                                this._unlockPanel();
                            });
                        }
                    }
                };

                if (count === files.length) {
                    // No files to load
                    loadCallback(-1)(null);
                }
                else {
                    // Files from server
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].url)
                            BABYLON.Tools.LoadFile(files[i].url, loadCallback(i), null, null, files[i].type === "arraybuffer");
                    }

                    // Files from FilesInput
                    for (var textureName in FilesInput.FilesTextures) {
                        files.push({ name: textureName, content: null, parentFolder: sceneFolder.file });
                        BABYLON.Tools.ReadFile(FilesInput.FilesTextures[textureName], loadCallback(files.length - 1), null, true);
                    }
                    
                    for (var fileName in FilesInput.FilesToLoad) {
                        files.push({ name: fileName, content: null, parentFolder: sceneFolder.file });
                        BABYLON.Tools.ReadFile(FilesInput.FilesToLoad[fileName], loadCallback(files.length - 1), null, true);
                    }
                }
            });
        }

        // Returns true if a file exists
        private _fileExists(files: IStorageUploadFile[], name: string, parent?: IStorageFile): boolean {
            for (var i = 0; i < files.length; i++) {
                if (files[i].name === name && files[i].parentFolder === parent.file) {
                    return true;
                }
            }

            return false;
        }

        // Processes the index.html file
        private _processIndexHTML(project: INTERNAL.IProjectRoot, content: string): string {
            var finalString = content;
            var scripts = "";

            for (var i = 0; i < project.requestedMaterials.length; i++) {
                scripts += "\t<script src=\"Materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
            }

            var sceneToLoad: File = (<any>this.core.editor.filesInput)._sceneFileToLoad;
            if (sceneToLoad) {
                finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad.name);
            }

            finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);

            return finalString;
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