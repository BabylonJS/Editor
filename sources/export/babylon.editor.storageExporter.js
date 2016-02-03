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
                    _this._lockPanel("Creating Template...");
                    StorageExporter._projectFolder = folder;
                    StorageExporter._projectFolderChildren = folderChildren;
                    _this._storage.createFolders(["Materials", "Textures", "js", "Scene"], folder, function () {
                        _this._createTemplate();
                    }, function () {
                        _this._unlockPanel();
                    });
                });
            };
            // Exports
            StorageExporter.prototype.export = function () {
                var _this = this;
                if (!StorageExporter._projectFolder) {
                    this._openFolderDialog(function (folder, folderChildren) {
                        StorageExporter._projectFolder = folder;
                        StorageExporter._projectFolderChildren = folderChildren;
                        _this.export();
                    });
                }
                this._lockPanel("Saving on OneDrive...");
                this._updateFileList(function () {
                    var files = [
                        { name: "scene.js", content: EDITOR.ProjectExporter.ExportProject(_this.core) }
                    ];
                    _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                        _this._unlockPanel();
                    });
                });
            };
            // Returns the folder object from its name
            StorageExporter.prototype.getFolder = function (name) {
                return this._getFileFolder(name, "folder", StorageExporter._projectFolderChildren);
            };
            // Returns the file object from its name
            StorageExporter.prototype.getFile = function (name) {
                return this._getFileFolder(name, "file", StorageExporter._projectFolderChildren);
            };
            // Creates the template with all files
            StorageExporter.prototype._createTemplate = function () {
                var _this = this;
                this._updateFileList(function () {
                    var files = [];
                    var url = window.location.href;
                    url = url.replace(BABYLON.Tools.GetFilename(url), "");
                    var projectContent = EDITOR.ProjectExporter.ExportProject(_this.core, true);
                    var project = JSON.parse(projectContent);
                    // Files already loaded
                    files.push({ name: "scene.js", content: projectContent });
                    files.push({ name: "template.js", content: EDITOR.Exporter.ExportCode(_this.core), parentFolder: _this.getFolder("js").file });
                    // Files to load
                    var count = files.length;
                    files.push({ name: "index.html", url: url + "../templates/index.html", content: null });
                    files.push({ name: "babylon.max.js", url: url + "../libs/babylon.max.js", content: null, parentFolder: _this.getFolder("js").file });
                    // Textures
                    if (EDITOR.SceneFactory.HDRPipeline)
                        files.push({ name: "lensdirt.jpg", url: url + "Textures/lensdirt.jpg", content: null, parentFolder: _this.getFolder("Textures").file, type: "arraybuffer" });
                    // Materials
                    for (var i = 0; i < project.requestedMaterials.length; i++) {
                        var name = "babylon." + project.requestedMaterials[i] + ".js";
                        files.push({ name: name, url: url + "../libs/materials/" + name, content: null, parentFolder: _this.getFolder("Materials").file });
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
                                _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                                    _this._unlockPanel();
                                }, function () {
                                    _this._unlockPanel();
                                });
                            }
                        };
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
                        // Files from FileInput
                        for (var textureName in EDITOR.FilesInput.FilesTextures) {
                            files.push({ name: textureName, content: null, parentFolder: _this.getFolder("Scene").file });
                            BABYLON.Tools.ReadFile(EDITOR.FilesInput.FilesTextures[textureName], loadCallback(files.length - 1), null, true);
                        }
                        for (var fileName in EDITOR.FilesInput.FilesToLoad) {
                            files.push({ name: fileName, content: null, parentFolder: _this.getFolder("Scene").file });
                            BABYLON.Tools.ReadFile(EDITOR.FilesInput.FilesToLoad[fileName], loadCallback(files.length - 1), null, true);
                        }
                        var sceneToLoad = _this.core.editor.filesInput._sceneFileToLoad;
                        files.push({ name: sceneToLoad.name, content: null, parentFolder: _this.getFolder("Scene").file });
                        BABYLON.Tools.ReadFile(sceneToLoad, loadCallback(files.length - 1), null, false);
                    }
                });
            };
            // Processes the index.html file
            StorageExporter.prototype._processIndexHTML = function (project, content) {
                var finalString = content;
                var scripts = "";
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    scripts += "\t<script src=\"Materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
                }
                var sceneToLoad = this.core.editor.filesInput._sceneFileToLoad;
                if (sceneToLoad) {
                    finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad.name);
                }
                finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);
                return finalString;
            };
            // Creates the UI dialog to choose folder
            StorageExporter.prototype._openFolderDialog = function (success) {
                var _this = this;
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
                this._storage.getFiles(StorageExporter._projectFolder, function (children) {
                    StorageExporter._projectFolderChildren = children;
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
            // Locks the panel
            StorageExporter.prototype._lockPanel = function (message) {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.lockPanel("bottom", message, true);
            };
            // Unlocks the panel
            StorageExporter.prototype._unlockPanel = function () {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.unlockPanel("bottom");
            };
            // Static members
            StorageExporter._projectFolder = null;
            StorageExporter._projectFolderChildren = null;
            return StorageExporter;
        })();
        EDITOR.StorageExporter = StorageExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.storageExporter.js.map