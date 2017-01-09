module BABYLON.EDITOR {
    interface IMaterialsGrid extends GUI.IGridRowData {
        name: string;
    }

    export class MaterialBuilder implements ITabApplication, IEventReceiver {
        // Public members
        public hasFocus: boolean = true;

        // Private members
        private _core: EditorCore;

        private _engine: Engine = null;
        private _scene: Scene = null;
        private _camera: Camera = null;
        private _box: Mesh = null;
        private _ground: Mesh = null;
        private _skybox: Mesh = null;
        private _defaultMaterial: Material = null;

        private _pointLight: PointLight = null;
        private _hemisphericLight: HemisphericLight = null;
        private _directionalLight: DirectionalLight = null;
        private _spotLight: SpotLight = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _editLayouts: GUI.GUILayout = null;
        private _debugLayouts: GUI.GUILayout = null;

        private _toolbar: GUI.GUIToolbar = null;

        private _codePanel: GUI.GUIPanel = null;
        private _vertexTabId: string = SceneFactory.GenerateUUID();
        private _pixelTabId: string = SceneFactory.GenerateUUID();
        private _configTabId: string = SceneFactory.GenerateUUID();
        private _currentTabId: string = this._vertexTabId;

        private _codeEditor: AceAjax.Editor = null;
        private _debugEditor: AceAjax.Editor = null;

        private _editForm: GUI.GUIEditForm = null;

        private _extension: EXTENSIONS.MaterialBuilderExtension = null;
        private _mainExtension: EXTENSIONS.MaterialBuilderExtension = null;
        private _currentMetadata: EXTENSIONS.IMaterialExtensionData = null;
        private _currentSettings: EXTENSIONS.IMaterialBuilderSettings = null;

        private _sceneConfig = {
            pointLight: true,
            hemisphericLight: false,
            directionalLight: false,
            spotLight: false,

            drawShadow: true,
            shadowIntensity: 0,

            meshes: ["box", "ground"],
            currentMesh: "box"
        };

        // Static members
        static _VertexShaderString: string = null;
        static _PixelShaderString: string = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
            core.eventReceivers.push(this);

            // Finalize
            this._createSelectionWindow(core);
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._core.removeEventReceiver(this);

            // Finalize dispose
            this._codeEditor.destroy();
            this._debugEditor.destroy();

            this._toolbar.destroy();
            this._editLayouts.destroy();
            this._debugLayouts.destroy();
            this._layouts.destroy();

            this._engine.dispose();
        }

        /**
        * On Focus
        */
        public onFocus(): void {
            BABYLON.Tools.Error = (entry: string) => {
                this._debugEditor.getSession().setValue(this._debugEditor.getSession().getValue() + "\n" + entry);
            };
        }

        /**
        * On event
        */
        public onEvent(event: Event): boolean {
            if (!this.hasFocus)
                return false;
            
            if (event.eventType === EventType.KEY_EVENT) {
                if (event.keyEvent.control && event.keyEvent.key === "b" && !event.keyEvent.isDown) {
                    this._buildMaterial();
                }
            }

            return false;
        }

        // Builds the material
        private _buildMaterial(releaseOnScene: boolean = false): void {
            this._debugEditor.getSession().setValue("Ready.");

            try {
                // Set up textures for test scene
                var settings = <EXTENSIONS.IMaterialBuilderSettings> JSON.parse(this._currentMetadata.config);
                
                for (var i = 0; i < settings.samplers.length; i++) {
                    var name = settings.samplers[i].textureName;
                    var texture: BaseTexture = null;

                    if (BABYLON.FilesInput.FilesTextures[name]) {
                        texture = new Texture("file:" + name, this._scene);
                    }
                }

                // Build material etc.
                if (!releaseOnScene) {
                    this._extension.apply([this._currentMetadata]);
                    this._box.material = this._scene.getMaterialByName(this._currentMetadata.name);
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
        }

        // Builds the GUI editor form to edit custom
        private _buildEditForm(): void {
            if (this._editForm)
                this._editForm.remove();

            this._editForm = new GUI.GUIEditForm("MATERIAL-BUILDER-EDIT", this._core);
            this._editForm.buildElement("MATERIAL-BUILDER-EDIT");

            var generalFolder = this._editForm.addFolder("General");
            generalFolder.add(this._currentMetadata, "name").name("Name");
            generalFolder.add(this, "_buildMaterial").name("Build Material");

            var configFolder = this._editForm.addFolder("Configuration");

            var lightsFolder = configFolder.addFolder("Lights");
            lightsFolder.open();
            lightsFolder.add(this._sceneConfig, "pointLight").name("Point Light").onChange((result) => this._pointLight.setEnabled(result));
            lightsFolder.add(this._sceneConfig, "hemisphericLight").name("Hemispheric Light").onChange((result) => this._hemisphericLight.setEnabled(result));
            lightsFolder.add(this._sceneConfig, "directionalLight").name("Directional Light").onChange((result) => this._directionalLight.setEnabled(result));
            lightsFolder.add(this._sceneConfig, "spotLight").name("Spot Light").onChange((result) => this._spotLight.setEnabled(result));

            var shadowFolder = configFolder.addFolder("Shadows");
            shadowFolder.open();
            shadowFolder.add(this._sceneConfig, "drawShadow").name("Draw shadows").onChange((result) => this._ground.receiveShadows = result);
            shadowFolder.add(this._sceneConfig, "shadowIntensity").min(0).max(1).name("Shadow Intensity").onChange((result) => {
                (<ShadowGenerator>this._pointLight.getShadowGenerator()).setDarkness(result);
                (<ShadowGenerator>this._directionalLight.getShadowGenerator()).setDarkness(result);
                (<ShadowGenerator>this._spotLight.getShadowGenerator()).setDarkness(result);
            });

            var meshFolder = configFolder.addFolder("Meshes");
            meshFolder.open();
            meshFolder.add(this._sceneConfig, "currentMesh", this._sceneConfig.meshes).onChange((result) => {
                this._box.material = this._ground.material = this._defaultMaterial;
                var material = this._scene.getMaterialByID(this._currentMetadata.name);

                switch (result) {
                    case "box": this._box.material = material; break;
                    case "ground": this._ground.material = material; break;
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
                            arrayFolder.add(config.uniforms[i].value, j.toString()).name("Value " + j);
                    }
                    else
                        uniformsFolder.add(config.uniforms[i], "value").name(config.uniforms[i].name);
                }

                // Samplers
                var samplersFolder = this._editForm.addFolder("Samplers");
                var textures: string[] = [];

                for (var i = 0; i < this._core.currentScene.textures.length; i++)
                    textures.push(this._core.currentScene.textures[i].name.replace("file:", "").replace("data:", ""));

                for (var i = 0; i < config.samplers.length; i++) {
                    this._changeTextureForm(samplersFolder, textures, config, i);
                }
            }
        }

        private _changeTextureForm(folder: dat.IFolderElement, textures: string[], config: EXTENSIONS.IMaterialBuilderSettings, indice: number): void {
            folder.add(config.samplers[indice], "textureName", textures).name(config.samplers[indice].uniformName).onFinishChange((result: string) => {
                var texture = new Texture("file:" + result, this._scene);
                config.samplers[indice].object = texture;
                config.samplers[indice].textureName = result;
            });
        }

        // Creates the UI
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Material Builder", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layouts
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("MATERIAL-BUILDER-LEFT-PANEL", "left", 330, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-DEBUG"));
            this._layouts.createPanel("MATERIAL-BUILDER-RIGHT-PANEL", "main", 300, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-LAYOUT", "width: 100%; height: 100%;"));
            this._layouts.createPanel("MATERIAL-BUILDER-TOP-PANEL", "top", 45, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-TOOLBAR", "width: 100%; height: 100%;"));
            this._layouts.buildElement(this._containerID);

            var editLayoutDiv = $("#MATERIAL-BUILDER-EDIT-LAYOUT");

            this._editLayouts = new GUI.GUILayout("MATERIAL-BUILDER-EDIT-LAYOUT", this._core);
            this._editLayouts.createPanel("MATERIAL-BUILDER-CANVAS-PANEL", "main", 300, true).setContent(GUI.GUIElement.CreateElement("canvas", "MATERIAL-BUILDER-CANVAS", "width: 100%; height: 100%;"));
            this._editLayouts.createPanel("MATERIAL-BUILDER-CODE-PANEL", "top", editLayoutDiv.height() - 300, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-CODE-EDIT", "width: 100%; height: 100%;"));
            this._editLayouts.buildElement("MATERIAL-BUILDER-EDIT-LAYOUT");

            var debugLayoutDiv = $("#MATERIAL-BUILDER-EDIT-DEBUG");
            this._debugLayouts = new GUI.GUILayout("MATERIAL-BUILDER-EDIT-DEBUG", this._core);
            this._debugLayouts.createPanel("MATERIAL-BUILDER-CANVAS-PANEL", "main", 300, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT-CONSOLE", "width: 100%; height: 100%;"));
            this._debugLayouts.createPanel("MATERIAL-BUILDER-CODE-PANEL", "top", debugLayoutDiv.height() - 300, true).setContent(GUI.GUIElement.CreateElement("div", "MATERIAL-BUILDER-EDIT", "width: 100%; height: 100%;"));
            this._debugLayouts.buildElement("MATERIAL-BUILDER-EDIT-DEBUG");

            // Tabs
            this._codePanel = this._editLayouts.getPanelFromType("top");
            this._codePanel.createTab({ caption: "Vertex", closable: false, id: this._vertexTabId });
            this._codePanel.createTab({ caption: "Pixel", closable: false, id: this._pixelTabId });
            this._codePanel.createTab({ caption: "Configuration", closable: false, id: this._configTabId });
            this._codePanel.onTabChanged = (id) => this._onTabChanged(id);

            // Toolbar
            this._toolbar = new GUI.GUIToolbar("MATERIAL-BUILDER-TOOLBAR", this._core);
            this._toolbar.createMenu("button", "BUILD-ON-SCENE", "Apply on scene", "icon-scene");
            this._toolbar.buildElement("MATERIAL-BUILDER-TOOLBAR");

            // Code
            this._codeEditor = ace.edit("MATERIAL-BUILDER-CODE-EDIT");
            this._codeEditor.setTheme("ace/theme/clouds");
            this._codeEditor.getSession().setMode("ace/mode/glsl");
            this._codeEditor.getSession().setValue(this._currentMetadata.vertex);
            this._codeEditor.getSession().on("change", (e) => this._onCodeEditorChanged());

            // Console
            this._debugEditor = ace.edit("MATERIAL-BUILDER-EDIT-CONSOLE");
            this._debugEditor.setTheme("ace/theme/clouds");
            this._debugEditor.getSession().setMode("ace/mode/javascript");
            this._debugEditor.getSession().setValue("");

            // Engine and scene
            this._engine = new Engine(<HTMLCanvasElement>$("#MATERIAL-BUILDER-CANVAS")[0]);
            this._scene = new Scene(this._engine);

            this._camera = new ArcRotateCamera("MaterialBuilderCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, Vector3.Zero(), this._scene);
            this._camera.attachControl(this._engine.getRenderingCanvas());

            this._pointLight = new PointLight("MaterialBuilderLight", new Vector3(25, 25, 25), this._scene);

            this._hemisphericLight = new HemisphericLight("MaterialBuilderHemLight", new Vector3(0, 1, 0), this._scene);
            this._hemisphericLight.setEnabled(false);

            this._directionalLight = new DirectionalLight("MaterialBuilderDirLight", new Vector3(-2, -1, -2), this._scene);
            this._directionalLight.setEnabled(false);

            this._spotLight = new SpotLight("MaterialBuilderSpotLight", new Vector3(10, 30, 10), new Vector3(-1, -2, -1), 1, 1, this._scene);
            this._spotLight.setEnabled(false);

            this._box = Mesh.CreateBox("box", 10, this._scene);

            // Ground
            this._ground = Mesh.CreateGround("MaterialBuilderGround", 200, 200, 64, this._scene);
            this._ground.receiveShadows = true;
            this._ground.position.y = -5;

            var groundMaterial = new StandardMaterial("MaterialBuilderGroundMaterial", this._scene);

            Tools.CreateFileFromURL("website/textures/empty.jpg", (file) => {
                var diffuseTexture = new Texture("file:empty.jpg", this._scene);
                diffuseTexture.name = "groundEmpty.jpg";
                diffuseTexture.uScale = diffuseTexture.vScale = 10;
                groundMaterial.diffuseTexture = diffuseTexture;
            }, true);

            this._ground.material = groundMaterial;
            this._defaultMaterial = groundMaterial;

            this._skybox = Mesh.CreateBox("MaterialBuilderSkyBox", 1000, this._scene, false, Mesh._BACKSIDE);
            (this._skybox.material = new SkyMaterial("MaterialBuilderSkyMaterial", this._scene)).inclination = 0;

            // Shadow
            new ShadowGenerator(512, this._spotLight).getShadowMap().renderList.push(this._box);
            new ShadowGenerator(512, this._pointLight).getShadowMap().renderList.push(this._box);
            new ShadowGenerator(512, this._directionalLight).getShadowMap().renderList.push(this._box);
            new ShadowGenerator(512, this._spotLight).getShadowMap().renderList.push(this._box);

            // Render loop
            this._engine.runRenderLoop(() => this._scene.render());

            // Events
            this._editLayouts.on("resize", (event) => {
                this._engine.resize();
                this._codeEditor.resize(true);
                this._editForm.width = this._layouts.getPanelFromType("left").width - 10;
            });

            this._layouts.on("resize", (event) => this._editLayouts.resize());

            this._toolbar.onClick = (item) => {
                switch (item.parent) {
                    case "BUILD-ON-SCENE": this._buildMaterial(true); break;
                    default: break;
                }
            };

            // Extensions
            this._extension = new EXTENSIONS.MaterialBuilderExtension(this._scene);
            this._mainExtension = new EXTENSIONS.MaterialBuilderExtension(this._core.currentScene, true);

            // Form
            this._buildEditForm();

            // Error
            this.onFocus();
        }

        // On tab changed
        private _onTabChanged(id: string): void {
            this._currentTabId = id;
            this._codeEditor.getSession().setMode("ace/mode/glsl");

            switch (id) {
                case this._vertexTabId: this._codeEditor.getSession().setValue(this._currentMetadata.vertex); break;
                case this._pixelTabId: this._codeEditor.getSession().setValue(this._currentMetadata.pixel); break;
                case this._configTabId:
                    this._codeEditor.getSession().setMode("ace/mode/javascript");
                    this._codeEditor.getSession().setValue(this._currentMetadata.config);
                    break;
                default: break;
            }
        }

        // On editor changed
        private _onCodeEditorChanged(): void {
            var value = this._codeEditor.getSession().getValue();

            switch (this._currentTabId) {
                case this._vertexTabId: this._currentMetadata.vertex = value; break;
                case this._pixelTabId: this._currentMetadata.pixel = value; break;
                case this._configTabId: this._currentMetadata.config = value; break;
                default: break;
            }
        }

        // Loads the shader files
        private _loadShaderFiles(callback: () => void): void {
            if (MaterialBuilder._VertexShaderString && MaterialBuilder._PixelShaderString)
                callback();

            BABYLON.Tools.LoadFile("website/resources/materials/material.vertex.fx", (dataVertex: string) => {
                MaterialBuilder._VertexShaderString = dataVertex;
                BABYLON.Tools.LoadFile("website/resources/materials/material.fragment.fx", (dataPixel: string) => {
                    MaterialBuilder._PixelShaderString = dataPixel;
                    callback();
                });
            });
        }

        // Gets the matadatas
        private _getMetadatas(): EXTENSIONS.IMaterialExtensionData[] {
            var metadatas = SceneManager.GetCustomMetadata<EXTENSIONS.IMaterialExtensionData[]>("MaterialBuilder") || [];
            SceneManager.AddCustomMetadata("MaterialBuilder", metadatas);

            return metadatas;
        }

        // Stores the metadatas
        private _storeMetadatas(data: EXTENSIONS.IMaterialExtensionData): void {
            var datas = this._getMetadatas();

            // Set metadatas
            var newData = <EXTENSIONS.IMaterialExtensionData>{
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
            SceneManager.AddCustomMetadata("MaterialBuilder", datas);
        }

        // Draws a window with already existing materials
        private _createSelectionWindow(core: EditorCore): void {
            // Window
            var window = new GUI.GUIWindow("MATERIAL-BUILDER-SELECT-MATERIAL", this._core, "Select a material", "");
            window.body = GUI.GUIElement.CreateDivElement("MATERIALS-GRID", "width: 100%; height: 100%;");
            window.buttons = ["Select", "Cancel"];
            window.showMax = false;
            window.buildElement(null);

            // Grid
            var grid = new GUI.GUIGrid<IMaterialsGrid>("MATERIALS-GRID", core);
            grid.showAdd = true;
            grid.showDelete = true;
            grid.createColumn("name", "Name", "100%");
            grid.buildElement("MATERIALS-GRID");

            var datas = this._getMetadatas();
            for (var i = 0; i < datas.length; i++)
                grid.addRecord({ recid: i, name: datas[i].name });

            grid.refresh();

            // Events
            grid.onAdd = () => {
                var newMaterial = <EXTENSIONS.IMaterialExtensionData> {
                    name: "New Material " + SceneFactory.GenerateUUID(),
                    vertex: MaterialBuilder._VertexShaderString,
                    pixel: MaterialBuilder._PixelShaderString,
                    config: JSON.stringify(<EXTENSIONS.IMaterialBuilderSettings> {
                        samplers: [{
                            "textureName": "empty.jpg",
                            "uniformName": "myTexture"
                        }],
                        uniforms: [{
                            name: "exposure",
                            value: 1
                        }] 
                    }, null, "\t"),
                };

                this._storeMetadatas(newMaterial);
                grid.addRecord({ recid: grid.getRowCount() - 1, name: newMaterial.name });
                grid.refresh();
            };

            grid.onDelete = (selected: number[]) => {
                var count = 0;
                for (var i = 0; i < selected.length; i++) {
                    datas.splice(selected[i] - count, 1);
                    count++;
                }
            };

            window.onButtonClicked = (buttonId: string) => {
                if (buttonId === "Select") {
                    var selected = grid.getSelectedRows();

                    if (selected.length < 1)
                        return;
                    
                    this._currentMetadata = this._getMetadatas()[selected[0]];
                    this._createUI();
                }
                
                window.close();
            };

            window.setOnCloseCallback(() => {
                grid.destroy();
            });

            window.lock("Loading template...");
            this._loadShaderFiles(() => window.unlock());
        }
    }
}
