module BABYLON.EDITOR {
    export class CosmosEditor implements ITabApplication {
        // Public members

        // Private members
        private _core: EditorCore;

        private _engine: Engine = null;
        private _scene: Scene = null;
        private _camera: FreeCamera = null;
        private _light: PointLight = null;
        private _skybox: Mesh = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _editor: GUI.GUIEditForm = null;

        private _extension: EXTENSIONS.CosmosExtension = null;

        private _dummyIdSearch: string = "";

        // Static members
        public static _ConfigurationFileContent: string = null;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;

            // Create UI
            this._createUI();
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._layouts.destroy();
            this._engine.dispose();
        }

        // Creates the UI
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Cosmos Editor", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("COSMOS-EDITOR-LEFT-PANEL", "left", 300, false).setContent(GUI.GUIElement.CreateElement("div", "COSMOS-EDITOR-EDIT", "width: 100%; height: 100%;"));
            this._layouts.createPanel("COSMOS-EDITOR-MAIN-PANEL", "main", 0, false).setContent(GUI.GUIElement.CreateElement("canvas", "COSMOS-EDITOR-CANVAS"));
            this._layouts.buildElement(this._containerID);

            this._layouts.on("resize", (event) => {
                this._engine.resize();
            });

            // Canvas
            this._engine = new Engine(<HTMLCanvasElement>$("#COSMOS-EDITOR-CANVAS")[0]);

            this._scene = new Scene(this._engine);
            this._scene.clearColor = new Color4(0, 0, 0, 1);

            this._camera = new FreeCamera("CosmosFreeCamera", new Vector3(150, 150, 150), this._scene);
            this._camera.setTarget(Vector3.Zero());
            this._camera.attachControl(this._engine.getRenderingCanvas());

            this._light = new PointLight("CosmosLight", Vector3.Zero(), this._scene);
            this._light.parent = this._camera;

            this._skybox = Mesh.CreateBox("skyBox", 10000.0, this._scene);
            var skyboxMaterial = new StandardMaterial("skyBox", this._scene);
            skyboxMaterial.backFaceCulling = false;
            var files = [
                "website/textures/space/space_left.jpg",
                "website/textures/space/space_up.jpg",
                "website/textures/space/space_front.jpg",
                "website/textures/space/space_right.jpg",
                "website/textures/space/space_down.jpg",
                "website/textures/space/space_back.jpg",
            ];
            skyboxMaterial.reflectionTexture = CubeTexture.CreateFromImages(files, this._scene);
            skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
            skyboxMaterial.diffuseColor = new Color3(1, 1, 1);
            skyboxMaterial.specularColor = new Color3(0, 0, 0);
            skyboxMaterial.disableLighting = true;
            this._skybox.material = skyboxMaterial;

            var standard = new StandardRenderingPipeline("StandardRenderingPipeline", this._scene, 1.0 / devicePixelRatio, null, [this._camera]);
            standard.LensFlareEnabled = true;
            standard.lensFlareStrength = 50;
            standard.brightThreshold = 1;
            standard.lensTexture = standard.lensFlareDirtTexture = new Texture("website/textures/lensdirt.jpg", this._scene);
            standard.lensStarTexture = new Texture("website/textures/lensstar.png", this._scene);
            standard.lensColorTexture = new Texture("website/textures/lenscolor.png", this._scene);

            this._engine.runRenderLoop(() => {
                this._scene.render();
                this._extension.updateMeshes();
            });

            // Create Extension
            this._extension = new EXTENSIONS.CosmosExtension(this._scene);

            // Editor
            this._editor = new GUI.GUIEditForm("COSMOS-EDITOR-EDIT", this._core);
            this._editor.buildElement("COSMOS-EDITOR-EDIT");

            var rootFolder = this._editor.addFolder("Root node");
            rootFolder.add(this._extension, "distanceToRoot").min(1).max(1000).step(1).name("Distance to root").onChange(() => this._reset());
            rootFolder.add(this._extension, "heightFromRoot").min(1).max(500).step(1).name("Height from root").onChange(() => this._reset());

            var functionsFolder = this._editor.addFolder("Functions nodes");
            functionsFolder.add(this._extension, "distanceToFunction").min(0).max(100).name("Distance to function").onChange(() => this._reset());
            functionsFolder.add(this._extension, "functionsDistance").min(0.01).max(10).step(0.01).name("Functions distance").onChange(() => this._reset());
            functionsFolder.add(this._extension, "sphereDiameter").min(0).max(100).step(0.01).name("Spheres diameter").onChange(() => this._reset());

            var animationsFolder = this._editor.addFolder("Animations");
            animationsFolder.add(this._extension, "animationsDistance").min(1).max(10).step(0.01).name("Animations distance").onChange(() => this._reset());

            var searchFolder = this._editor.addFolder("Search");
            searchFolder.add(this, "_dummyIdSearch").name("Search title").onChange((value: string) => {
                this._extension.animateCameraToId(value === "" ? "root" : value);
            });
        }

        // Reset the extension
        private _reset(): void {
            this._extension.reset();

            // Add custom metadatas
            var data = <EXTENSIONS.ICosmosConfiguration> {
                distanceToRoot: this._extension.distanceToRoot,
                heightFromRoot: this._extension.heightFromRoot,
                functionsDistance: this._extension.functionsDistance,
                animationsDistance: this._extension.animationsDistance,
                sphereDiameter: this._extension.sphereDiameter
            };

            SceneManager.AddCustomMetadata("CosmosExtension", data);
            this._extension.apply(data);
        }
    }
}
