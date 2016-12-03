var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var CosmosEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function CosmosEditor(core) {
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._light = null;
                this._skybox = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._editor = null;
                this._extension = null;
                this._dummyIdSearch = "";
                // Configure this
                this._core = core;
                // Create UI
                this._createUI();
            }
            /**
            * Disposes the application
            */
            CosmosEditor.prototype.dispose = function () {
                this._layouts.destroy();
                this._engine.dispose();
            };
            // Creates the UI
            CosmosEditor.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Cosmos Editor", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("COSMOS-EDITOR-LEFT-PANEL", "left", 300, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "COSMOS-EDITOR-EDIT", "width: 100%; height: 100%;"));
                this._layouts.createPanel("COSMOS-EDITOR-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "COSMOS-EDITOR-CANVAS"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._engine.resize();
                });
                // Canvas
                this._engine = new BABYLON.Engine($("#COSMOS-EDITOR-CANVAS")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._scene.clearColor = BABYLON.Color3.Black();
                this._camera = new BABYLON.FreeCamera("CosmosFreeCamera", new BABYLON.Vector3(150, 150, 150), this._scene);
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._light = new BABYLON.PointLight("CosmosLight", BABYLON.Vector3.Zero(), this._scene);
                this._light.parent = this._camera;
                this._skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, this._scene);
                var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this._scene);
                skyboxMaterial.backFaceCulling = false;
                var files = [
                    "website/textures/space/space_left.jpg",
                    "website/textures/space/space_up.jpg",
                    "website/textures/space/space_front.jpg",
                    "website/textures/space/space_right.jpg",
                    "website/textures/space/space_down.jpg",
                    "website/textures/space/space_back.jpg",
                ];
                skyboxMaterial.reflectionTexture = BABYLON.CubeTexture.CreateFromImages(files, this._scene);
                skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                skyboxMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
                skyboxMaterial.disableLighting = true;
                this._skybox.material = skyboxMaterial;
                var standard = new BABYLON.StandardRenderingPipeline("StandardRenderingPipeline", this._scene, 1.0 / devicePixelRatio, null, [this._camera]);
                standard.LensFlareEnabled = true;
                standard.lensFlareStrength = 50;
                standard.brightThreshold = 1;
                standard.lensTexture = standard.lensFlareDirtTexture = new BABYLON.Texture("website/textures/lensdirt.jpg", this._scene);
                standard.lensStarTexture = new BABYLON.Texture("website/textures/lensstar.png", this._scene);
                standard.lensColorTexture = new BABYLON.Texture("website/textures/lenscolor.png", this._scene);
                this._engine.runRenderLoop(function () {
                    _this._scene.render();
                    _this._extension.updateMeshes();
                });
                // Create Extension
                this._extension = new EDITOR.EXTENSIONS.CosmosExtension(this._scene);
                // Editor
                this._editor = new EDITOR.GUI.GUIEditForm("COSMOS-EDITOR-EDIT", this._core);
                this._editor.buildElement("COSMOS-EDITOR-EDIT");
                var rootFolder = this._editor.addFolder("Root node");
                rootFolder.add(this._extension, "distanceToRoot").min(1).max(1000).step(1).name("Distance to root").onChange(function () { return _this._reset(); });
                rootFolder.add(this._extension, "heightFromRoot").min(1).max(500).step(1).name("Height from root").onChange(function () { return _this._reset(); });
                var functionsFolder = this._editor.addFolder("Functions nodes");
                functionsFolder.add(this._extension, "distanceToFunction").min(0).max(100).name("Distance to function").onChange(function () { return _this._reset(); });
                functionsFolder.add(this._extension, "functionsDistance").min(0.01).max(10).step(0.01).name("Functions distance").onChange(function () { return _this._reset(); });
                functionsFolder.add(this._extension, "sphereDiameter").min(0).max(100).step(0.01).name("Spheres diameter").onChange(function () { return _this._reset(); });
                var animationsFolder = this._editor.addFolder("Animations");
                animationsFolder.add(this._extension, "animationsDistance").min(1).max(10).step(0.01).name("Animations distance").onChange(function () { return _this._reset(); });
                var searchFolder = this._editor.addFolder("Search");
                searchFolder.add(this, "_dummyIdSearch").name("Search title").onChange(function (value) {
                    _this._extension.animateCameraToId(value === "" ? "root" : value);
                });
            };
            // Reset the extension
            CosmosEditor.prototype._reset = function () {
                this._extension.reset();
                // Add custom metadatas
                var data = {
                    distanceToRoot: this._extension.distanceToRoot,
                    heightFromRoot: this._extension.heightFromRoot,
                    functionsDistance: this._extension.functionsDistance,
                    animationsDistance: this._extension.animationsDistance,
                    sphereDiameter: this._extension.sphereDiameter
                };
                EDITOR.SceneManager.AddCustomMetadata("CosmosExtension", data);
                this._extension.apply(data);
            };
            // Static members
            CosmosEditor._ConfigurationFileContent = null;
            return CosmosEditor;
        }());
        EDITOR.CosmosEditor = CosmosEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.cosmosEditor.js.map
