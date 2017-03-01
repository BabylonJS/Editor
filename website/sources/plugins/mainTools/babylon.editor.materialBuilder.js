var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MaterialBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function MaterialBuilder(core) {
                // Public members
                this.hasFocus = true;
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._box = null;
                this._ground = null;
                this._skybox = null;
                this._defaultMaterial = null;
                this._pointLight = null;
                this._hemisphericLight = null;
                this._directionalLight = null;
                this._spotLight = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._editLayouts = null;
                this._debugLayouts = null;
                this._toolbar = null;
                this._codePanel = null;
                this._vertexTabId = EDITOR.SceneFactory.GenerateUUID();
                this._pixelTabId = EDITOR.SceneFactory.GenerateUUID();
                this._configTabId = EDITOR.SceneFactory.GenerateUUID();
                this._currentTabId = this._vertexTabId;
                this._codeEditor = null;
                this._debugEditor = null;
                this._editForm = null;
                this._extension = null;
                this._mainExtension = null;
                this._currentMetadata = null;
                this._currentSettings = null;
                this._sceneConfig = {
                    pointLight: true,
                    hemisphericLight: false,
                    directionalLight: false,
                    spotLight: false,
                    drawShadow: true,
                    shadowIntensity: 0,
                    meshes: ["box", "ground"],
                    currentMesh: "box"
                };
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Finalize
                this._createSelectionWindow(core);
            }
            /**
            * Disposes the application
            */
            MaterialBuilder.prototype.dispose = function () {
                this._core.removeEventReceiver(this);
                // Finalize dispose
                this._codeEditor.destroy();
                this._debugEditor.destroy();
                this._toolbar.destroy();
                this._editLayouts.destroy();
                this._debugLayouts.destroy();
                this._layouts.destroy();
                this._engine.dispose();
            };
            /**
            * On Focus
            */
            MaterialBuilder.prototype.onFocus = function () {
                var _this = this;
                BABYLON.Tools.Error = function (entry) {
                    _this._debugEditor.getSession().setValue(_this._debugEditor.getSession().getValue() + "\n" + entry);
                };
            };
            /**
            * On event
            */
            MaterialBuilder.prototype.onEvent = function (event) {
                if (!this.hasFocus)
                    return false;
                if (event.eventType === EDITOR.EventType.KEY_EVENT) {
                    if (event.keyEvent.control && event.keyEvent.key === "b" && !event.keyEvent.isDown) {
                        this._buildMaterial();
                    }
                }
                return false;
            };
            // Builds the material
            MaterialBuilder.prototype._buildMaterial = function (releaseOnScene) {
                if (releaseOnScene === void 0) { releaseOnScene = false; }
                this._debugEditor.getSession().setValue("Ready.");
                try {
                    // Set up textures for test scene
                    var settings = JSON.parse(this._currentMetadata.config);
                    for (var i = 0; i < settings.samplers.length; i++) {
                        var name = settings.samplers[i].textureName;
                        var texture = null;
                        if (BABYLON.FilesInput.FilesTextures[name]) {
                            texture = new BABYLON.Texture("file:" + name, this._scene);
                        }
                    }
                    // Build material etc.
                    if (!releaseOnScene) {
                        this._extension.apply([this._currentMetadata]);
                        var material = this._scene.getMaterialByName(this._currentMetadata.name);
                        switch (this._sceneConfig.currentMesh) {
                            case "box":
                                this._box.material = material;
                                break;
                            case "ground":
                                this._ground.material = material;
                                break;
                            default: break;
                        }
                    }
                    else {
                        this._mainExtension.apply([this._currentMetadata]);
                    }
                    this._currentSettings = this._currentMetadata.object;
                    delete this._currentMetadata.object;
                    this._buildEditForm();
                }
                catch (e) {
                    // GUI.GUIWindow.CreateAlert("Cannot parse given configuration... " + (e.message ? e.message : ""), "Warning");
                    BABYLON.Tools.Error("Cannot parse given configuration...\n" + (e.message ? e.message : ""));
                }
            };
            // Builds the GUI editor form to edit custom
            MaterialBuilder.prototype._buildEditForm = function () {
                var _this = this;
                if (this._editForm)
                    this._editForm.remove();
                var material = this._scene.getMaterialByID(this._currentMetadata.name);
                this._editForm = new EDITOR.GUI.GUIEditForm("MATERIAL-BUILDER-EDIT", this._core);
                this._editForm.buildElement("MATERIAL-BUILDER-EDIT");
                var generalFolder = this._editForm.addFolder("General");
                generalFolder.add(this._currentMetadata, "name").name("Name").onChange(function (result) {
                    if (!material)
                        return;
                    var releasedMaterial = _this._core.currentScene.getMaterialByID(material.id);
                    if (releasedMaterial)
                        releasedMaterial.id = releasedMaterial.name = result;
                    material.id = material.name = result;
                    // Update edition tools
                    _this._core.editor.editionTool.updateEditionTool();
                });
                generalFolder.add(this, "_buildMaterial").name("Build Material");
                var configFolder = this._editForm.addFolder("Configuration");
                var lightsFolder = configFolder.addFolder("Lights");
                lightsFolder.open();
                lightsFolder.add(this._sceneConfig, "pointLight").name("Point Light").onChange(function (result) { return _this._pointLight.setEnabled(result); });
                lightsFolder.add(this._sceneConfig, "hemisphericLight").name("Hemispheric Light").onChange(function (result) { return _this._hemisphericLight.setEnabled(result); });
                lightsFolder.add(this._sceneConfig, "directionalLight").name("Directional Light").onChange(function (result) { return _this._directionalLight.setEnabled(result); });
                lightsFolder.add(this._sceneConfig, "spotLight").name("Spot Light").onChange(function (result) { return _this._spotLight.setEnabled(result); });
                var shadowFolder = configFolder.addFolder("Shadows");
                shadowFolder.open();
                shadowFolder.add(this._sceneConfig, "drawShadow").name("Draw shadows").onChange(function (result) { return _this._ground.receiveShadows = result; });
                shadowFolder.add(this._sceneConfig, "shadowIntensity").min(0).max(1).name("Shadow Intensity").onChange(function (result) {
                    _this._pointLight.getShadowGenerator().setDarkness(result);
                    _this._directionalLight.getShadowGenerator().setDarkness(result);
                    _this._spotLight.getShadowGenerator().setDarkness(result);
                });
                var meshFolder = configFolder.addFolder("Meshes");
                meshFolder.open();
                meshFolder.add(this._sceneConfig, "currentMesh", this._sceneConfig.meshes).onChange(function (result) {
                    _this._box.material = _this._ground.material = _this._defaultMaterial;
                    switch (result) {
                        case "box":
                            _this._box.material = material;
                            break;
                        case "ground":
                            _this._ground.material = material;
                            break;
                        default: break;
                    }
                });
                if (this._currentMetadata && this._currentSettings) {
                    var config = this._currentSettings;
                    // Uniforms
                    var uniformsFolder = this._editForm.addFolder("Uniforms");
                    for (var i = 0; i < config.uniforms.length; i++) {
                        var value = config.uniforms[i].value;
                        if (value instanceof Array) {
                            var arrayFolder = uniformsFolder.addFolder(config.uniforms[i].name);
                            arrayFolder.open();
                            for (var j = 0; j < value.length; j++)
                                arrayFolder.add(config.uniforms[i]._cachedValue, j.toString()).name("Value " + j);
                        }
                        else
                            uniformsFolder.add(config.uniforms[i], "_cachedValue").name(config.uniforms[i].name);
                    }
                    // Samplers
                    var samplersFolder = this._editForm.addFolder("Samplers");
                    var textures = [];
                    for (var i = 0; i < this._core.currentScene.textures.length; i++)
                        textures.push(this._core.currentScene.textures[i].name.replace("file:", "").replace("data:", ""));
                    for (var i = 0; i < config.samplers.length; i++) {
                        this._changeTextureForm(samplersFolder, textures, config, i);
                    }
                }
            };
            MaterialBuilder.prototype._changeTextureForm = function (folder, textures, config, indice) {
                var _this = this;
                folder.add(config.samplers[indice], "textureName", textures).name(config.samplers[indice].uniformName).onFinishChange(function (result) {
                    var texture = new BABYLON.Texture("file:" + result, _this._scene);
                    config.samplers[indice].object = texture;
                    config.samplers[indice].textureName = result;
                });
            };
            // Creates the UI
            MaterialBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Material Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layouts
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("MATERIAL-BUILDER-LEFT-PANEL", "left", 330, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-DEBUG"));
                this._layouts.createPanel("MATERIAL-BUILDER-RIGHT-PANEL", "main", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-LAYOUT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("MATERIAL-BUILDER-TOP-PANEL", "top", 45, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-TOOLBAR", "width: 100%; height: 100%;"));
                this._layouts.buildElement(this._containerID);
                var editLayoutDiv = $("#MATERIAL-BUILDER-EDIT-LAYOUT");
                this._editLayouts = new EDITOR.GUI.GUILayout("MATERIAL-BUILDER-EDIT-LAYOUT", this._core);
                this._editLayouts.createPanel("MATERIAL-BUILDER-CANVAS-PANEL", "main", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "MATERIAL-BUILDER-CANVAS", "width: 100%; height: 100%;"));
                this._editLayouts.createPanel("MATERIAL-BUILDER-CODE-PANEL", "top", editLayoutDiv.height() - 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-CODE-EDIT", "width: 100%; height: 100%;"));
                this._editLayouts.buildElement("MATERIAL-BUILDER-EDIT-LAYOUT");
                var debugLayoutDiv = $("#MATERIAL-BUILDER-EDIT-DEBUG");
                this._debugLayouts = new EDITOR.GUI.GUILayout("MATERIAL-BUILDER-EDIT-DEBUG", this._core);
                this._debugLayouts.createPanel("MATERIAL-BUILDER-CANVAS-PANEL", "main", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-CONSOLE", "width: 100%; height: 100%;"));
                this._debugLayouts.createPanel("MATERIAL-BUILDER-CODE-PANEL", "top", debugLayoutDiv.height() - 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT", "width: 100%; height: 100%;"));
                this._debugLayouts.buildElement("MATERIAL-BUILDER-EDIT-DEBUG");
                // Tabs
                this._codePanel = this._editLayouts.getPanelFromType("top");
                this._codePanel.createTab({ caption: "Vertex", closable: false, id: this._vertexTabId });
                this._codePanel.createTab({ caption: "Pixel", closable: false, id: this._pixelTabId });
                this._codePanel.createTab({ caption: "Configuration", closable: false, id: this._configTabId });
                this._codePanel.onTabChanged = function (id) { return _this._onTabChanged(id); };
                // Toolbar
                this._toolbar = new EDITOR.GUI.GUIToolbar("MATERIAL-BUILDER-TOOLBAR", this._core);
                this._toolbar.createMenu("button", "BUILD-ON-SCENE", "Apply on scene", "icon-scene");
                this._toolbar.buildElement("MATERIAL-BUILDER-TOOLBAR");
                // Code
                this._codeEditor = ace.edit("MATERIAL-BUILDER-CODE-EDIT");
                this._codeEditor.setTheme("ace/theme/clouds");
                this._codeEditor.getSession().setMode("ace/mode/glsl");
                this._codeEditor.getSession().setValue(this._currentMetadata.vertex);
                this._codeEditor.getSession().on("change", function (e) { return _this._onCodeEditorChanged(); });
                // Console
                this._debugEditor = ace.edit("MATERIAL-BUILDER-EDIT-CONSOLE");
                this._debugEditor.setTheme("ace/theme/clouds");
                this._debugEditor.getSession().setMode("ace/mode/javascript");
                this._debugEditor.getSession().setValue("");
                // Engine and scene
                this._engine = new BABYLON.Engine($("#MATERIAL-BUILDER-CANVAS")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.ArcRotateCamera("MaterialBuilderCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, BABYLON.Vector3.Zero(), this._scene);
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._pointLight = new BABYLON.PointLight("MaterialBuilderLight", new BABYLON.Vector3(25, 25, 25), this._scene);
                this._hemisphericLight = new BABYLON.HemisphericLight("MaterialBuilderHemLight", new BABYLON.Vector3(0, 1, 0), this._scene);
                this._hemisphericLight.setEnabled(false);
                this._directionalLight = new BABYLON.DirectionalLight("MaterialBuilderDirLight", new BABYLON.Vector3(-2, -1, -2), this._scene);
                this._directionalLight.setEnabled(false);
                this._spotLight = new BABYLON.SpotLight("MaterialBuilderSpotLight", new BABYLON.Vector3(10, 30, 10), new BABYLON.Vector3(-1, -2, -1), 1, 1, this._scene);
                this._spotLight.setEnabled(false);
                this._box = BABYLON.Mesh.CreateBox("box", 10, this._scene);
                // Ground
                this._ground = BABYLON.Mesh.CreateGround("MaterialBuilderGround", 200, 200, 64, this._scene);
                this._ground.receiveShadows = true;
                this._ground.position.y = -5;
                var groundMaterial = new BABYLON.StandardMaterial("MaterialBuilderGroundMaterial", this._scene);
                EDITOR.Tools.CreateFileFromURL("website/textures/empty.jpg", function (file) {
                    var diffuseTexture = new BABYLON.Texture("file:empty.jpg", _this._scene);
                    diffuseTexture.name = "groundEmpty.jpg";
                    diffuseTexture.uScale = diffuseTexture.vScale = 10;
                    groundMaterial.diffuseTexture = diffuseTexture;
                }, true);
                this._ground.material = groundMaterial;
                this._defaultMaterial = groundMaterial;
                this._skybox = BABYLON.Mesh.CreateBox("MaterialBuilderSkyBox", 1000, this._scene, false, BABYLON.Mesh._BACKSIDE);
                (this._skybox.material = new BABYLON.SkyMaterial("MaterialBuilderSkyMaterial", this._scene)).inclination = 0;
                // Shadow generators
                new BABYLON.ShadowGenerator(512, this._spotLight).getShadowMap().renderList.push(this._box);
                new BABYLON.ShadowGenerator(512, this._pointLight).getShadowMap().renderList.push(this._box);
                new BABYLON.ShadowGenerator(512, this._directionalLight).getShadowMap().renderList.push(this._box);
                new BABYLON.ShadowGenerator(512, this._spotLight).getShadowMap().renderList.push(this._box);
                // Render loop
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                // Events
                this._editLayouts.on("resize", function (event) {
                    _this._engine.resize();
                    _this._codeEditor.resize(true);
                    _this._editForm.width = _this._layouts.getPanelFromType("left").width - 10;
                });
                this._layouts.on("resize", function (event) { return _this._editLayouts.resize(); });
                this._toolbar.onClick = function (item) {
                    switch (item.parent) {
                        case "BUILD-ON-SCENE":
                            _this._buildMaterial(true);
                            break;
                        default: break;
                    }
                };
                // Extensions
                this._extension = new EDITOR.EXTENSIONS.MaterialBuilderExtension(this._scene);
                this._mainExtension = new EDITOR.EXTENSIONS.MaterialBuilderExtension(this._core.currentScene, true);
                // Form
                this._buildEditForm();
                // Error
                this.onFocus();
            };
            // On tab changed
            MaterialBuilder.prototype._onTabChanged = function (id) {
                this._currentTabId = id;
                this._codeEditor.getSession().setMode("ace/mode/glsl");
                switch (id) {
                    case this._vertexTabId:
                        this._codeEditor.getSession().setValue(this._currentMetadata.vertex);
                        break;
                    case this._pixelTabId:
                        this._codeEditor.getSession().setValue(this._currentMetadata.pixel);
                        break;
                    case this._configTabId:
                        this._codeEditor.getSession().setMode("ace/mode/javascript");
                        this._codeEditor.getSession().setValue(this._currentMetadata.config);
                        break;
                    default: break;
                }
            };
            // On editor changed
            MaterialBuilder.prototype._onCodeEditorChanged = function () {
                var value = this._codeEditor.getSession().getValue();
                switch (this._currentTabId) {
                    case this._vertexTabId:
                        this._currentMetadata.vertex = value;
                        break;
                    case this._pixelTabId:
                        this._currentMetadata.pixel = value;
                        break;
                    case this._configTabId:
                        this._currentMetadata.config = value;
                        break;
                    default: break;
                }
            };
            // Loads the shader files
            MaterialBuilder.prototype._loadShaderFiles = function (callback) {
                if (MaterialBuilder._VertexShaderString && MaterialBuilder._PixelShaderString)
                    callback();
                BABYLON.Tools.LoadFile("website/resources/materials/material.vertex.fx", function (dataVertex) {
                    MaterialBuilder._VertexShaderString = dataVertex;
                    BABYLON.Tools.LoadFile("website/resources/materials/material.fragment.fx", function (dataPixel) {
                        MaterialBuilder._PixelShaderString = dataPixel;
                        callback();
                    });
                });
            };
            // Gets the matadatas
            MaterialBuilder.prototype._getMetadatas = function () {
                var metadatas = EDITOR.SceneManager.GetCustomMetadata("MaterialBuilder") || [];
                EDITOR.SceneManager.AddCustomMetadata("MaterialBuilder", metadatas);
                return metadatas;
            };
            // Stores the metadatas
            MaterialBuilder.prototype._storeMetadatas = function (data) {
                var datas = this._getMetadatas();
                // Set metadatas
                var newData = {
                    name: data.name,
                    pixel: data.pixel,
                    vertex: data.vertex,
                    config: data.config
                };
                // Store
                for (var i = 0; i < datas.length; i++) {
                    if (datas[i].name === data.name) {
                        datas[i] = newData;
                        return;
                    }
                }
                datas.push(data);
                EDITOR.SceneManager.AddCustomMetadata("MaterialBuilder", datas);
            };
            // Draws a window with already existing materials
            MaterialBuilder.prototype._createSelectionWindow = function (core) {
                var _this = this;
                // Window
                var window = new EDITOR.GUI.GUIWindow("MATERIAL-BUILDER-SELECT-MATERIAL", this._core, "Select a material", "");
                window.body = EDITOR.GUI.GUIElement.CreateDivElement("MATERIALS-GRID", "width: 100%; height: 100%;");
                window.buttons = ["Select", "Cancel"];
                window.showMax = false;
                window.buildElement(null);
                // Grid
                var grid = new EDITOR.GUI.GUIGrid("MATERIALS-GRID", core);
                grid.showAdd = true;
                grid.showDelete = true;
                grid.createColumn("name", "Name", "100%");
                grid.buildElement("MATERIALS-GRID");
                var datas = this._getMetadatas();
                for (var i = 0; i < datas.length; i++)
                    grid.addRecord({ recid: i, name: datas[i].name });
                grid.refresh();
                // Events
                grid.onAdd = function () {
                    var newMaterial = {
                        name: "New Material " + EDITOR.SceneFactory.GenerateUUID(),
                        vertex: MaterialBuilder._VertexShaderString,
                        pixel: MaterialBuilder._PixelShaderString,
                        config: JSON.stringify({
                            samplers: [{
                                    "textureName": "empty.jpg",
                                    "uniformName": "myTexture"
                                }],
                            uniforms: [{
                                    name: "exposure",
                                    value: 1
                                }],
                            time: true
                        }, null, "\t"),
                    };
                    _this._storeMetadatas(newMaterial);
                    grid.addRecord({ recid: grid.getRowCount() - 1, name: newMaterial.name });
                    grid.refresh();
                };
                grid.onDelete = function (selected) {
                    var count = 0;
                    for (var i = 0; i < selected.length; i++) {
                        var material = _this._core.currentScene.getMaterialByID(datas[selected[i] - count].name);
                        if (material) {
                            var meshes = material.getBindedMeshes();
                            for (var j = 0; j < meshes.length; j++)
                                meshes[j].material = null;
                        }
                        material.dispose(true, false);
                        datas.splice(selected[i] - count, 1);
                        count++;
                    }
                };
                window.onButtonClicked = function (buttonId) {
                    if (buttonId === "Select") {
                        var selected = grid.getSelectedRows();
                        if (selected.length < 1)
                            return;
                        _this._currentMetadata = _this._getMetadatas()[selected[0]];
                        _this._createUI();
                    }
                    window.close();
                };
                window.setOnCloseCallback(function () {
                    grid.destroy();
                });
                window.lock("Loading template...");
                this._loadShaderFiles(function () { return window.unlock(); });
            };
            return MaterialBuilder;
        }());
        // Static members
        MaterialBuilder._VertexShaderString = null;
        MaterialBuilder._PixelShaderString = null;
        EDITOR.MaterialBuilder = MaterialBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.materialBuilder.js.map
