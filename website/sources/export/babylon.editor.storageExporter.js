var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StorageExporter = (function () {
            /**
            * Constructor
            */
            function StorageExporter(core, storageType) {
                if (storageType === void 0) { storageType = StorageExporter.OneDriveStorage; }
                this._window = null;
                this._filesList = null;
                this._currentChildrenFolder = null;
                this._currentFolder = null;
                this._previousFolders = null;
                this._onFolderSelected = null;
                this._statusBarId = "ONE-DRIVE-STATUS-BAR";
                // Initialize
                this.core = core;
                core.eventReceivers.push(this);
                this._storage = new BABYLON.EDITOR[storageType](this.core);
            }
            Object.defineProperty(StorageExporter, "OneDriveStorage", {
                // Static members
                get: function () {
                    return "OneDriveStorage";
                },
                enumerable: true,
                configurable: true
            });
            // On event received
            StorageExporter.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._filesList && event.guiEvent.eventType === EDITOR.GUIEventType.GRID_SELECTED) {
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
                else if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._window && event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED) {
                    var button = event.guiEvent.data;
                    var selectedRows = this._filesList.getSelectedRows();
                    if (button === "Choose" && this._currentFolder) {
                        this._storage.getFiles(this._currentFolder, function (children) {
                            _this._onFolderSelected(_this._currentFolder, children);
                        });
                    }
                    this._window.close();
                    return true;
                }
                return false;
            };
            // Creates a template
            StorageExporter.prototype.createTemplate = function () {
                var _this = this;
                this._openFolderDialog(function (folder, folderChildren) {
                    // Status bar
                    _this.core.editor.statusBar.addElement(_this._statusBarId, "Preparing Template...", "icon-one-drive");
                    _this.core.editor.statusBar.showSpinner(_this._statusBarId);
                    StorageExporter._ProjectFolder = folder;
                    StorageExporter._ProjectFolderChildren = folderChildren;
                    // Dont replace or rename already existing folders
                    var folders = ["materials", "textures", "libs", "scene", "defines", "code", ".vscode"];
                    for (var i = 0; i < folderChildren.length; i++) {
                        var folderIndex = folders.indexOf(folderChildren[i].name);
                        if (folderIndex !== -1)
                            folders.splice(folderIndex, 1);
                    }
                    var config = {
                        codeFolderExists: folders.indexOf("code") === -1,
                        vscodeFolderExists: folders.indexOf(".vscode") === -1
                    };
                    if (folders.length === 0)
                        _this._createTemplate(config);
                    else {
                        _this._storage.createFolders(folders, folder, function () {
                            _this._createTemplate(config);
                        }, function () {
                            _this.core.editor.statusBar.removeElement(_this._statusBarId);
                        });
                    }
                });
            };
            // Exports
            StorageExporter.prototype.export = function () {
                var _this = this;
                if (!StorageExporter._ProjectFolder) {
                    this._openFolderDialog(function (folder, folderChildren) {
                        StorageExporter._ProjectFolder = folder;
                        StorageExporter._ProjectFolderChildren = folderChildren;
                        _this.export();
                    });
                    return;
                }
                this.core.editor.statusBar.addElement(this._statusBarId, "Exporting...", EDITOR.Tools.CheckIfElectron() ? "icon-save" : "icon-one-drive");
                this.core.editor.statusBar.showSpinner(this._statusBarId);
                this._updateFileList(function () {
                    var files = [
                        { name: "scene.editorproject", content: EDITOR.ProjectExporter.ExportProject(_this.core) }
                    ];
                    _this._storage.createFiles(files, StorageExporter._ProjectFolder, function () {
                        _this.core.editor.statusBar.removeElement(_this._statusBarId);
                    });
                });
            };
            // Creates the template with all files
            StorageExporter.prototype._createTemplate = function (config) {
                var _this = this;
                this._updateFileList(function () {
                    // Files
                    var files = [];
                    var url = EDITOR.Tools.GetBaseURL();
                    var projectContent = EDITOR.ProjectExporter.ExportProject(_this.core, true);
                    var project = JSON.parse(projectContent);
                    var sceneFolder = _this.getFolder("scene");
                    // Files already loaded
                    var sceneToLoad = _this.core.editor.filesInput._sceneFileToLoad;
                    files.push({ name: sceneToLoad ? sceneToLoad.name : "scene.babylon", content: JSON.stringify(EDITOR.BabylonExporter.GenerateFinalBabylonFile(_this.core)), parentFolder: sceneFolder.file });
                    files.push({ name: "extensions.editorextensions", content: JSON.stringify(project.customMetadatas), parentFolder: sceneFolder.file });
                    // Lens flare textures
                    for (var i = 0; i < project.lensFlares.length; i++) {
                        var lf = project.lensFlares[i].serializationObject;
                        for (var j = 0; j < lf.flares.length; j++) {
                            if (!_this._fileExists(files, lf.flares[j].base64Name, sceneFolder)) {
                                files.push({
                                    name: lf.flares[j].base64Name,
                                    content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer),
                                    parentFolder: sceneFolder.file
                                });
                            }
                        }
                    }
                    // Particle system textures
                    for (var i = 0; i < project.particleSystems.length; i++) {
                        var ps = project.particleSystems[i].serializationObject;
                        if (!_this._fileExists(files, ps.base64TextureName, sceneFolder)) {
                            files.push({
                                name: ps.base64TextureName,
                                content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture),
                                parentFolder: sceneFolder.file
                            });
                        }
                    }
                    // Textures
                    if (EDITOR.SceneFactory.HDRPipeline && EDITOR.SceneFactory.HDRPipeline.lensTexture) {
                        var lensTextureName = EDITOR.SceneFactory.HDRPipeline.lensTexture.name;
                        //files.push({ name: lensTextureName, url: url + "Textures/" + lensTextureName, content: null, parentFolder: this.getFolder("Textures").file, type: "arraybuffer" });
                        files.push({
                            name: lensTextureName,
                            content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(EDITOR.SceneFactory.HDRPipeline.lensTexture._buffer),
                            parentFolder: _this.getFolder("textures").file
                        });
                    }
                    // Files to load
                    var count = files.length;
                    files.push({ name: "index.html", url: url + "templates/index.html", content: null });
                    if (!config.codeFolderExists) {
                        files.push({ name: "game.ts", url: url + "templates/game.ts.template", content: null, parentFolder: _this.getFolder("code").file });
                        files.push({ name: "development.ts", url: url + "templates/development.ts.template", content: null, parentFolder: _this.getFolder("code").file });
                    }
                    if (!config.vscodeFolderExists)
                        files.push({ name: "tasks.json", url: url + "templates/tasksTemplate.json", content: null, parentFolder: _this.getFolder(".vscode").file });
                    files.push({ name: "tsconfig.json", url: url + "templates/tsconfigTemplate.json", content: null });
                    files.push({ name: "Web.config", url: url + "templates/WebConfigTemplate.xml", content: null });
                    files.push({ name: "babylon.max.js", url: url + "libs/preview bjs/babylon.max.js", content: null, parentFolder: _this.getFolder("libs").file });
                    files.push({ name: "babylon.editor.extensions.js", url: url + "libs/preview release/babylon.editor.extensions.js", content: null, parentFolder: _this.getFolder("libs").file });
                    files.push({ name: "babylon.d.ts", url: url + "defines/babylon.d.ts", content: null, parentFolder: _this.getFolder("defines").file });
                    files.push({ name: "babylon.editor.extensions.d.ts", url: url + "libs/preview release/babylon.editor.extensions.d.ts", content: null, parentFolder: _this.getFolder("defines").file });
                    // Materials
                    for (var i = 0; i < project.requestedMaterials.length; i++) {
                        var name = "babylon." + project.requestedMaterials[i] + ".js";
                        files.push({ name: name, url: url + "libs/materials/" + name, content: null, parentFolder: _this.getFolder("materials").file });
                    }
                    // Load files
                    var loadCallback = function (indice) {
                        return function (data) {
                            count++;
                            if (indice >= 0) {
                                if (files[indice].name === "index.html") {
                                    data = _this._processIndexHTML(project, data);
                                }
                                files[indice].content = data;
                            }
                            if (count >= files.length) {
                                _this._storage.createFiles(files, StorageExporter._ProjectFolder, function () {
                                    _this.core.editor.statusBar.removeElement(_this._statusBarId);
                                }, function (message) {
                                    _this.core.editor.statusBar.removeElement(_this._statusBarId);
                                }, function (count) {
                                    _this.core.editor.statusBar.setText(_this._statusBarId, "Exporting Template... " + count + " / " + files.length);
                                });
                                StorageExporter._ProjectFolder = null;
                                StorageExporter._ProjectFolderChildren = null;
                            }
                        };
                    };
                    if (count === files.length) {
                        // No files to load
                        loadCallback(-1)(null);
                    }
                    else {
                        _this.core.editor.statusBar.setText(_this._statusBarId, "Configuring files...");
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
            };
            // Returns true if a file exists
            StorageExporter.prototype._fileExists = function (files, name, parent) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].name === name && files[i].parentFolder === parent.file) {
                        return true;
                    }
                }
                return false;
            };
            // Processes the index.html file
            StorageExporter.prototype._processIndexHTML = function (project, content) {
                var finalString = content;
                var scripts = "";
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    scripts += "\t<script src=\"materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
                }
                var sceneToLoad = this.core.editor.filesInput._sceneFileToLoad;
                finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad ? sceneToLoad.name : "scene.babylon");
                finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);
                return finalString;
            };
            // Creates the UI dialog to choose folder
            StorageExporter.prototype._openFolderDialog = function (success) {
                var _this = this;
                if (StorageExporter._IsWindowOpened)
                    return;
                StorageExporter._IsWindowOpened = true;
                this._onFolderSelected = success;
                var gridID = "BABYLON-STORAGE-EXPORTER-GRID";
                var gridDiv = EDITOR.GUI.GUIElement.CreateElement("div", gridID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-STORAGE-EXPORTER-WINDOW", this.core, "Choose folder...", gridDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    "Choose",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    StorageExporter._IsWindowOpened = false;
                    _this.core.removeEventReceiver(_this);
                    _this._filesList.destroy();
                });
                this._window.buildElement(null);
                // Grid
                this._filesList = new EDITOR.GUI.GUIGrid(gridID, this.core);
                this._filesList.header = "Files and Folders";
                this._filesList.createColumn("name", "name", "80%");
                this._filesList.createColumn("type", "type", "20%");
                this._filesList.buildElement(gridID);
                // Finish
                this._previousFolders = [];
                this._updateFolderDialog();
            };
            // Gets a list of files and folders
            StorageExporter.prototype._updateFolderDialog = function (folder) {
                var _this = this;
                if (folder === void 0) { folder = null; }
                this._filesList.lock("Loading...", true);
                this._filesList.clear();
                this._currentFolder = folder;
                this._filesList.addRow({
                    name: "..",
                    type: "previous",
                    recid: 0
                });
                this._storage.getFiles(folder, function (children) {
                    _this._currentChildrenFolder = children;
                    for (var i = 0; i < children.length; i++) {
                        _this._filesList.addRow({
                            name: children[i].name,
                            type: children[i].file.folder ? "folder" : "file",
                            recid: i + 1
                        });
                    }
                    _this._filesList.unlock();
                }, function () {
                    _this._filesList.unlock();
                });
            };
            // Updates the file list
            StorageExporter.prototype._updateFileList = function (onSuccess) {
                // Update files list and create files
                this._storage.getFiles(StorageExporter._ProjectFolder, function (children) {
                    StorageExporter._ProjectFolderChildren = children;
                    onSuccess();
                });
            };
            // Returns the appropriate child from its name and its type
            StorageExporter.prototype._getFileFolder = function (name, type, files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].file.name === name && files[i].file[type])
                        return files[i];
                }
                return {
                    file: null,
                    name: ""
                };
            };
            // Returns the folder object from its name
            StorageExporter.prototype.getFolder = function (name) {
                return this._getFileFolder(name, "folder", StorageExporter._ProjectFolderChildren);
            };
            // Returns the file object from its name
            StorageExporter.prototype.getFile = function (name) {
                return this._getFileFolder(name, "file", StorageExporter._ProjectFolderChildren);
            };
            // Static members
            StorageExporter._ProjectFolder = null;
            StorageExporter._ProjectFolderChildren = null;
            StorageExporter._IsWindowOpened = false;
            return StorageExporter;
        }());
        EDITOR.StorageExporter = StorageExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
