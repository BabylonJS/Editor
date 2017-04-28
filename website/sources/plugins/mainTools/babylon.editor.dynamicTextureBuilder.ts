module BABYLON.EDITOR {
    export class DynamicTextureBuilder implements ITabApplication {
        // Public members

        // Private members
        private _core: EditorCore;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _editForm: GUI.GUIEditForm = null;

        private _extension: EXTENSIONS.DynamicTextureBuilderExtension;
        private _currentMetadatas: EXTENSIONS.IDynamicTextureExtension[] = null;
        private _currentMetadata: EXTENSIONS.IDynamicTextureExtension = null;

        private _engine: Engine;
        private _scene: Scene;
        private _camera: ArcRotateCamera;
        private _ground: Mesh;
        private _material: StandardMaterial;

        private _currentTexture: string = "";

        // Constructor
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;

            // Create UI
            this._createUI();

            // Create extensions and scene
            this._createScene();

            this._extension = new EXTENSIONS.DynamicTextureBuilderExtension(this._scene);
            this._currentMetadatas = this._getMetadatas();

            // Create form
            this._createEditForm();
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._engine.dispose();
            this._layouts.destroy();
        }

        // Creates the edit form
        private _createEditForm(): void {
            if (this._editForm)
                this._editForm.remove();

            this._editForm = new GUI.GUIEditForm("DYNAMIC-TEXTURE-BUILDER-EDIT", this._core);
            this._editForm.buildElement("DYNAMIC-TEXTURE-BUILDER-EDIT");

            // Fill
            var textures: string[] = [];
            for (var i = 0; i < this._currentMetadatas.length; i++)
                textures.push(this._currentMetadatas[i].name);

            if (this._currentTexture === "") {
                this._currentTexture = textures[0];
                this._material.emissiveTexture = this._material.diffuseTexture = this._currentMetadatas[0].textureObject;
            }

            var mainFolder = this._editForm.addFolder("Main");
            mainFolder.add(this, "_currentTexture", textures).name("Current texture").onFinishChange((result: string) => {
                for (var i = 0; i < this._currentMetadatas.length; i++) {
                    if (this._currentMetadatas[i].name === result) {
                        this._currentMetadata = this._currentMetadatas[i];
                        break;
                    }
                }

                this._createEditForm();
            });
            mainFolder.add(this, "_createTextureInMainScene").name("Apply on scene...");

            // Edit texture
            var editFolder = this._editForm.addFolder("Edit");
            editFolder.add(this._currentMetadata, "name").name("Name").onFinishChange((result: string) => {
                this._currentTexture = result;
                this._createEditForm();
            });
            editFolder.add(this._currentMetadata, "clearColor").name("Clear color").onChange(() => this._onDynamicTextureChange());
            editFolder.add(this._currentMetadata, "hasAlpha").name("Has alpha").onChange(() => this._onDynamicTextureChange());

            editFolder.add(this._currentMetadata, "width").min(0).max(this._engine.getCaps().maxTextureSize / 2).step(1).name("Width").onChange(() => this._onDynamicTextureChange());
            editFolder.add(this._currentMetadata, "height").min(0).max(this._engine.getCaps().maxTextureSize / 2).step(1).name("height").onChange(() => this._onDynamicTextureChange());

            // Edit texture
            var editText = this._editForm.addFolder("Edit text");
            editText.add(this._currentMetadata, "text").name("Text").onChange(() => this._onDynamicTextureChange());
            editText.add(this._currentMetadata, "textx").step(1).name("x").onChange(() => this._onDynamicTextureChange());
            editText.add(this._currentMetadata, "texty").step(1).name("y").onChange(() => this._onDynamicTextureChange());
            editText.add(this._currentMetadata, "textColor").name("Text color").onChange(() => this._onDynamicTextureChange());
            editText.add(this._currentMetadata, "textFont").name("Text font").onChange(() => this._onDynamicTextureChange());
        }

        // When the dynamic texture has to be changed
        private _onDynamicTextureChange(scene?: Scene): DynamicTexture {
            if (!scene)
                scene = this._scene;
            
            var texture = this._currentMetadata.textureObject;
            texture.dispose();

            texture = this._currentMetadata.textureObject = new DynamicTexture(this._currentMetadata.name, { width: this._currentMetadata.width, height: this._currentMetadata.height }, scene, false);
            this._material.emissiveTexture = this._material.diffuseTexture = texture;

            texture.clear();
            texture.drawText(this._currentMetadata.text, this._currentMetadata.textx, this._currentMetadata.texty, this._currentMetadata.textFont, this._currentMetadata.textColor, this._currentMetadata.clearColor);
            texture.update(true);

            texture.hasAlpha = this._currentMetadata.hasAlpha;

            this._material.markAsDirty(Material.TextureDirtyFlag);
            this._material.markDirty();

            return texture;
        }

        // Creates the texture in main scene
        private _createTextureInMainScene(): void {
            var texture = this._onDynamicTextureChange(this._core.currentScene);

            for (var i = 0; i < this._core.currentScene.materials.length; i++) {
                var material = this._core.currentScene.materials[i];

                for (var thing in material) {
                    if (!(material[thing] instanceof DynamicTexture))
                        continue;

                    (<DynamicTexture>material[thing]).dispose();
                    material[thing] = texture;
                }
            }

            // GUI.GUIWindow.CreateAlert("Texture now available in main scene", "Information");
            this._layouts.lockPanel("main", "Texture now available", false);
            setTimeout(() => {
                this._layouts.unlockPanel("main");
            }, 1000);
        }

        // Gets the matadatas
        private _getMetadatas(): EXTENSIONS.IDynamicTextureExtension[] {
            var metadatas = SceneManager.GetCustomMetadata<EXTENSIONS.IDynamicTextureExtension[]>("DynamicTextureBuilder") || [];

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
                    textFont: "bold 30px verdana",

                    textureObject: new DynamicTexture("New dymanic texture", { width: 512, height: 512 }, this._scene, false)
                });

                metadatas[0].textureObject.drawText(metadatas[0].text, metadatas[0].textx, metadatas[0].texty, metadatas[0].textFont, "white", "black");
                metadatas[0].textureObject.update(true);

                this._currentMetadata = metadatas[0];
            }

            SceneManager.AddCustomMetadata("DynamicTextureBuilder", metadatas);

            return metadatas;
        }

        // Stores the metadatas
        private _storeMetadatas(data: EXTENSIONS.IDynamicTextureExtension[]): void {
            var datas = this._getMetadatas();
            SceneManager.AddCustomMetadata("DynamicTextureBuilder", datas);
        }

        // Creates the scene
        private _createScene(): void {
            this._engine = new Engine(<HTMLCanvasElement>$("#DYNAMIC-TEXTURE-BUILDER-CANVAS")[0]);
            this._scene = new Scene(this._engine);

            this._camera = new ArcRotateCamera("DynamicTextureBuilderCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, Vector3.Zero(), this._scene);
            this._camera.attachControl(this._engine.getRenderingCanvas());

            this._material = new StandardMaterial("DynamicTextureBuilderMaterial", this._scene);
            this._material.disableLighting = true;
            this._material.backFaceCulling = false;

            this._ground = Mesh.CreateGround("DynamicTextureBuilderGround", 100, 100, 2, this._scene);
            this._ground.receiveShadows = true;
            this._ground.position.y = -5;
            this._ground.material = this._material;

            this._engine.runRenderLoop(() => this._scene.render());
        }

        // Creates the UI
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Dynamic Texture Builder", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layouts
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("DYNAMIC-TEXTURE-BUILDER-LEFT-PANEL", "left", 330, true).setContent(GUI.GUIElement.CreateElement("div", "DYNAMIC-TEXTURE-BUILDER-EDIT"));
            this._layouts.createPanel("DYNAMIC-TEXTURE-BUILDER-RIGHT-PANEL", "main", 300, true).setContent(GUI.GUIElement.CreateElement("canvas", "DYNAMIC-TEXTURE-BUILDER-CANVAS", "width: 100%; height: 100%;"));
            this._layouts.buildElement(this._containerID);

            // Events
            this._layouts.on("resize", (event) => {
                this._engine.resize();
            });
        }
    }
}
