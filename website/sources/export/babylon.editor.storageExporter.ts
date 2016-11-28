module BABYLON.EDITOR {
    interface IStorageExporterGrid extends GUI.IGridRowData {
        name: string;
        type: string;
    }

    interface ITemplateConfiguration {
        codeFolderExists: boolean;
        vscodeFolderExists: boolean;
    }

    export class StorageExporter implements IEventReceiver {
        // Public members
        public core: EditorCore;

        // Private members
        private _storage: Storage;

        private _window: GUI.GUIWindow = null;
        private _filesList: GUI.GUIGrid<IStorageExporterGrid> = null;
        private _currentChildrenFolder: IStorageFile[] = null;
        private _currentFolder: IStorageFile = null;
        private _previousFolders: IStorageFile[] = null;
        private _onFolderSelected: (folder: IStorageFile, folderChildren: IStorageFile[]) => void = null;

        private _statusBarId: string = "ONE-DRIVE-STATUS-BAR";

        // Static members
        private static _ProjectFolder: IStorageFile = null;
        private static _ProjectFolderChildren: IStorageFile[] = null;

        private static _IsWindowOpened: boolean = false;

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
                // Status bar
                this.core.editor.statusBar.addElement(this._statusBarId, "Preparing Template...", "icon-one-drive");
                this.core.editor.statusBar.showSpinner(this._statusBarId);

                StorageExporter._ProjectFolder = folder;
                StorageExporter._ProjectFolderChildren = folderChildren;

                // Dont replace or rename already existing folders
                var folders = ["materials", "textures", "libs", "scene", "defines", "code", ".vscode"];
                for (var i = 0; i < folderChildren.length; i++) {
                    var folderIndex = folders.indexOf(folderChildren[i].name);

                    if (folderIndex !== -1)
                        folders.splice(folderIndex, 1);
                }

                var config: ITemplateConfiguration = {
                    codeFolderExists: folders.indexOf("code") === -1,
                    vscodeFolderExists: folders.indexOf(".vscode") === -1
                };

                if (folders.length === 0)
                    this._createTemplate(config);
                else {
                    this._storage.createFolders(folders, folder, () => {
                        this._createTemplate(config);
                    }, () => {
                        this.core.editor.statusBar.removeElement(this._statusBarId);
                    });
                }
            });
        }

        // Exports
        public export(): void {
            if (!StorageExporter._ProjectFolder) {
                this._openFolderDialog((folder: IStorageFile, folderChildren: IStorageFile[]) => {
                    StorageExporter._ProjectFolder = folder;
                    StorageExporter._ProjectFolderChildren = folderChildren;

                    this.export();
                });

                return;
            }

            this.core.editor.statusBar.addElement(this._statusBarId, "Exporting...", Tools.CheckIfElectron() ? "icon-save" : "icon-one-drive");
            this.core.editor.statusBar.showSpinner(this._statusBarId);

            this._updateFileList(() => {
                var files: IStorageUploadFile[] = [
                    { name: "scene.editorproject", content: ProjectExporter.ExportProject(this.core) }
                ];

                this._storage.createFiles(files, StorageExporter._ProjectFolder, () => {
                    this.core.editor.statusBar.removeElement(this._statusBarId);
                });
            });
        }

        // Creates the template with all files
        private _createTemplate(config: ITemplateConfiguration): void {
            this._updateFileList(() => {
                // Files
                var files: IStorageUploadFile[] = [];
                var url = Tools.GetBaseURL();
                var projectContent = ProjectExporter.ExportProject(this.core, true);
                var project: INTERNAL.IProjectRoot = JSON.parse(projectContent);
                var sceneFolder = this.getFolder("scene");

                // Files already loaded
                var sceneToLoad: File = (<any>this.core.editor.filesInput)._sceneFileToLoad;
                files.push({ name: sceneToLoad ? sceneToLoad.name : "scene.babylon", content: JSON.stringify(BabylonExporter.GenerateFinalBabylonFile(this.core)), parentFolder: sceneFolder.file });

                files.push({ name: "extensions.editorextensions", content: JSON.stringify(project.customMetadatas), parentFolder: sceneFolder.file });

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
                        parentFolder: this.getFolder("textures").file
                    });
                }

                // Files to load
                var count = files.length;
                
                files.push({ name: "index.html", url: url + "templates/index.html", content: null });

                if (!config.codeFolderExists) {
                    files.push({ name: "game.ts", url: url + "templates/game.ts.template", content: null, parentFolder: this.getFolder("code").file });
                    files.push({ name: "development.ts", url: url + "templates/development.ts.template", content: null, parentFolder: this.getFolder("code").file });
                }

                if (!config.vscodeFolderExists)
                    files.push({ name: "tasks.json", url: url + "templates/tasksTemplate.json", content: null, parentFolder: this.getFolder(".vscode").file });

                files.push({ name: "run.bat", url: url + "templates/run.bat", content: null });
                files.push({ name: "run.sh", url: url + "templates/run.bat", content: null });
                files.push({ name: "server.js", url: url + "templates/server.js", content: null });

                files.push({ name: "tsconfig.json", url: url + "templates/tsconfigTemplate.json", content: null });
                files.push({ name: "Web.config", url: url + "templates/WebConfigTemplate.xml", content: null });
                files.push({ name: "babylon.max.js", url: url + "libs/preview bjs/babylon.max.js", content: null, parentFolder: this.getFolder("libs").file });
                files.push({ name: "babylon.editor.extensions.js", url: url + "libs/preview release/babylon.editor.extensions.js", content: null, parentFolder: this.getFolder("libs").file });

                if (this.core.currentScene.getPhysicsEngine())
                    files.push({ name: "cannon.js", url: url + "libs/cannon.js", content: null, parentFolder: this.getFolder("libs").file });

                files.push({ name: "babylon.d.ts", url: url + "defines/babylon.d.ts", content: null, parentFolder: this.getFolder("defines").file });
                files.push({ name: "babylon.editor.extensions.d.ts", url: url + "libs/preview release/babylon.editor.extensions.d.ts", content: null, parentFolder: this.getFolder("defines").file });

                // Materials
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    var name = "babylon." + project.requestedMaterials[i] + ".js";
                    files.push({ name: name, url: url + "libs/materials/" + name, content: null, parentFolder: this.getFolder("materials").file });
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
                            this._storage.createFiles(files, StorageExporter._ProjectFolder, () => {
                                this.core.editor.statusBar.removeElement(this._statusBarId);
                            }, (message: string) => {
                                this.core.editor.statusBar.removeElement(this._statusBarId);
                            }, (count: number) => {
                                this.core.editor.statusBar.setText(this._statusBarId, "Exporting Template... " + count + " / " + files.length);
                            });

                            StorageExporter._ProjectFolder = null;
                            StorageExporter._ProjectFolderChildren = null;
                        }
                    }
                };

                if (count === files.length) {
                    // No files to load
                    loadCallback(-1)(null);
                }
                else {
                    this.core.editor.statusBar.setText(this._statusBarId, "Configuring files...");

                    // Files from server
                    for (var i = 0; i < files.length; i++) {
                        if (files[i].url)
                            BABYLON.Tools.LoadFile(files[i].url, loadCallback(i), null, null, files[i].type === "arraybuffer");
                    }

                    // Files from FilesInput
                    for (var textureName in BABYLON.FilesInput.FilesTextures) {
                        files.push({ name: textureName, content: null, parentFolder: sceneFolder.file });
                        BABYLON.Tools.ReadFile(BABYLON.FilesInput.FilesTextures[textureName], loadCallback(files.length - 1), null, true);
                    }
                    
                    for (var fileName in BABYLON.FilesInput.FilesToLoad) {
                        files.push({ name: fileName, content: null, parentFolder: sceneFolder.file });
                        BABYLON.Tools.ReadFile(BABYLON.FilesInput.FilesToLoad[fileName], loadCallback(files.length - 1), null, true);
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
                scripts += "\t<script src=\"materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
            }

            var sceneToLoad: File = (<any>this.core.editor.filesInput)._sceneFileToLoad;
            finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad ? sceneToLoad.name : "scene.babylon");

            finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);

            return finalString;
        }

        // Creates the UI dialog to choose folder
        private _openFolderDialog(success?: (folder: IStorageFile, folderChildren: IStorageFile[]) => void): void {
            if (StorageExporter._IsWindowOpened)
                return;
            
            StorageExporter._IsWindowOpened = true;

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
                StorageExporter._IsWindowOpened = false;
                
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
            this._filesList.addRecord({
                name: "..",
                type: "previous",
                recid: 0
            });

            this._storage.getFiles(folder, (children: IStorageFile[]) => {

                this._currentChildrenFolder = children;

                for (var i = 0; i < children.length; i++) {
                    this._filesList.addRecord({
                        name: children[i].name,
                        type: children[i].file.folder ? "folder" : "file",
                        recid: i + 1
                    });
                }
                
                this._filesList.refresh();
                this._filesList.unlock();
            }, () => {
                this._filesList.unlock();
            });
        }

        // Updates the file list
        private _updateFileList(onSuccess: () => void): void {
            // Update files list and create files
            this._storage.getFiles(StorageExporter._ProjectFolder, (children: IStorageFile[]) => {
                StorageExporter._ProjectFolderChildren = children;
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

        // Returns the folder object from its name
        public getFolder(name: string): IStorageFile {
            return this._getFileFolder(name, "folder", StorageExporter._ProjectFolderChildren);
        }

        // Returns the file object from its name
        public getFile(name: string): IStorageFile {
            return this._getFileFolder(name, "file", StorageExporter._ProjectFolderChildren);
        }
    }
}