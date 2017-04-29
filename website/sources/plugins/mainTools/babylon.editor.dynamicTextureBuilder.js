var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var DynamicTextureBuilder = (function () {
            // Constructor
            function DynamicTextureBuilder(core) {
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._editForm = null;
                this._currentMetadatas = null;
                this._currentMetadata = null;
                this._currentTexture = "";
                // Initialize
                this._core = core;
                // Create UI
                this._createUI();
                // Create extensions and scene
                this._createScene();
                this._extension = new EDITOR.EXTENSIONS.DynamicTextureBuilderExtension(this._scene);
                // Create form
                this._createEditForm();
            }
            /**
            * Disposes the application
            */
            DynamicTextureBuilder.prototype.dispose = function () {
                this._engine.dispose();
                this._layouts.destroy();
            };
            // Creates the edit form
            DynamicTextureBuilder.prototype._createEditForm = function () {
                var _this = this;
                if (this._editForm)
                    this._editForm.remove();
                this._editForm = new EDITOR.GUI.GUIEditForm("DYNAMIC-TEXTURE-BUILDER-EDIT", this._core);
                this._editForm.buildElement("DYNAMIC-TEXTURE-BUILDER-EDIT");
                this._currentMetadatas = this._getMetadatas();
                // Fill
                var textures = [];
                for (var i = 0; i < this._currentMetadatas.length; i++)
                    textures.push(this._currentMetadatas[i].name);
                if (this._currentTexture === "") {
                    this._currentTexture = textures[0];
                    this._material.emissiveTexture = this._material.diffuseTexture = this._textureObject;
                }
                var mainFolder = this._editForm.addFolder("Main");
                mainFolder.add(this, "_currentTexture", textures).name("Current texture").onFinishChange(function (result) {
                    for (var i = 0; i < _this._currentMetadatas.length; i++) {
                        if (_this._currentMetadatas[i].name === result) {
                            _this._currentMetadata = _this._currentMetadatas[i];
                            break;
                        }
                    }
                    _this._createEditForm();
                });
                mainFolder.add(this, "_createTextureInMainScene").name("Apply on scene...");
                // Edit texture
                var editFolder = this._editForm.addFolder("Edit");
                editFolder.add(this._currentMetadata, "name").name("Name").onFinishChange(function (result) {
                    _this._currentTexture = result;
                    _this._createTextureInMainScene();
                    _this._createEditForm();
                });
                editFolder.add(this._currentMetadata, "clearColor").name("Clear color").onChange(function () { return _this._createTextureInMainScene(); });
                editFolder.add(this._currentMetadata, "hasAlpha").name("Has alpha").onChange(function () { return _this._createTextureInMainScene(); });
                editFolder.add(this._currentMetadata, "width").min(0).max(this._engine.getCaps().maxTextureSize / 2).step(1).name("Width").onChange(function () { return _this._createTextureInMainScene(); });
                editFolder.add(this._currentMetadata, "height").min(0).max(this._engine.getCaps().maxTextureSize / 2).step(1).name("height").onChange(function () { return _this._createTextureInMainScene(); });
                // Edit texture
                var editText = this._editForm.addFolder("Edit text");
                editText.add(this._currentMetadata, "text").name("Text").onChange(function () { return _this._createTextureInMainScene(); });
                editText.add(this._currentMetadata, "textx").step(1).name("x").onChange(function () { return _this._createTextureInMainScene(); });
                editText.add(this._currentMetadata, "texty").step(1).name("y").onChange(function () { return _this._createTextureInMainScene(); });
                editText.add(this._currentMetadata, "textColor").name("Text color").onChange(function () { return _this._createTextureInMainScene(); });
                editText.add(this._currentMetadata, "textFont").name("Text font").onChange(function () { return _this._createTextureInMainScene(); });
            };
            // When the dynamic texture has to be changed
            DynamicTextureBuilder.prototype._onDynamicTextureChange = function (scene) {
                if (!scene)
                    scene = this._scene;
                var texture;
                if (scene === this._scene)
                    texture = this._textureObject;
                else
                    texture = this._sceneTextureObject;
                if (texture)
                    texture.dispose();
                texture = EDITOR.EXTENSIONS.DynamicTextureBuilderExtension.SetupDynamicTexture(this._currentMetadata, scene);
                if (scene === this._scene) {
                    this._textureObject = texture;
                    this._material.emissiveTexture = this._material.diffuseTexture = texture;
                }
                else
                    this._sceneTextureObject = texture;
                this._material.markAsDirty(BABYLON.Material.TextureDirtyFlag);
                this._material.markDirty();
                return texture;
            };
            // Creates the texture in main scene
            DynamicTextureBuilder.prototype._createTextureInMainScene = function (storeMetadatas) {
                if (storeMetadatas === void 0) { storeMetadatas = true; }
                var texture = this._onDynamicTextureChange(this._core.currentScene);
                for (var i = 0; i < this._core.currentScene.materials.length; i++) {
                    var material = this._core.currentScene.materials[i];
                    for (var thing in material) {
                        if (!(material[thing] instanceof BABYLON.DynamicTexture))
                            continue;
                        material[thing] = texture;
                    }
                }
                // Rebuild local
                this._onDynamicTextureChange();
                // Store metadatas
                if (storeMetadatas)
                    this._storeMetadatas();
            };
            // Gets the matadatas
            DynamicTextureBuilder.prototype._getMetadatas = function () {
                var metadatas = EDITOR.SceneManager.GetCustomMetadata("DynamicTextureBuilder") || [];
                if (metadatas.length === 0) {
                    metadatas.push({
                        name: "New dynamic texture",
                        width: 512,
                        height: 512,
                        clearColor: "black",
                        hasAlpha: false,
                        textx: 256,
                        texty: 256,
                        text: "Hello world",
                        textColor: "white",
                        textFont: "bold 30px verdana"
                    });
                }
                if (!this._currentMetadata) {
                    for (var i = 0; i < this._core.currentScene.textures.length; i++) {
                        var texture = this._core.currentScene.textures[i];
                        if (texture instanceof BABYLON.DynamicTexture && texture.name === metadatas[0].name) {
                            this._sceneTextureObject = texture;
                            break;
                        }
                    }
                    this._currentMetadata = metadatas[0];
                    this._createTextureInMainScene(false);
                }
                EDITOR.SceneManager.AddCustomMetadata("DynamicTextureBuilder", metadatas);
                return metadatas;
            };
            // Stores the metadatas
            DynamicTextureBuilder.prototype._storeMetadatas = function () {
                var datas = this._getMetadatas();
                EDITOR.SceneManager.AddCustomMetadata("DynamicTextureBuilder", datas);
            };
            // Creates the scene
            DynamicTextureBuilder.prototype._createScene = function () {
                var _this = this;
                this._engine = new BABYLON.Engine($("#DYNAMIC-TEXTURE-BUILDER-CANVAS")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.ArcRotateCamera("DynamicTextureBuilderCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, BABYLON.Vector3.Zero(), this._scene);
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._material = new BABYLON.StandardMaterial("DynamicTextureBuilderMaterial", this._scene);
                this._material.disableLighting = true;
                this._material.backFaceCulling = false;
                this._ground = BABYLON.Mesh.CreateGround("DynamicTextureBuilderGround", 100, 100, 2, this._scene);
                this._ground.receiveShadows = true;
                this._ground.position.y = -5;
                this._ground.material = this._material;
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
            };
            // Creates the UI
            DynamicTextureBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Dynamic Texture Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layouts
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("DYNAMIC-TEXTURE-BUILDER-LEFT-PANEL", "left", 330, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "DYNAMIC-TEXTURE-BUILDER-EDIT"));
                this._layouts.createPanel("DYNAMIC-TEXTURE-BUILDER-RIGHT-PANEL", "main", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "DYNAMIC-TEXTURE-BUILDER-CANVAS", "width: 100%; height: 100%;"));
                this._layouts.buildElement(this._containerID);
                // Events
                this._layouts.on("resize", function (event) {
                    _this._engine.resize();
                });
            };
            return DynamicTextureBuilder;
        }());
        EDITOR.DynamicTextureBuilder = DynamicTextureBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.dynamicTextureBuilder.js.map
