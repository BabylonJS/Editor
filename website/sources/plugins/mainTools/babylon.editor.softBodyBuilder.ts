module BABYLON.EDITOR {
    export class SoftBodyBuilder implements ITabApplication, IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;

        private _engine: Engine = null;
        private _scene: Scene = null;
        private _camera: ArcRotateCamera = null;
        private _light: PointLight = null;
        private _sphere: Mesh = null;

        private _selectedMesh: GroundMesh = null;
        private _baseMesh: GroundMesh = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _toolbar: GUI.GUIToolbar = null;
        private _editTool: GUI.GUIEditForm = null;

        private _extension: EDITOR.EXTENSIONS.SoftBodyBuilderExtension;
        private _selectedMetadata: EXTENSIONS.ISoftBodyData;

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
            core.eventReceivers.push(this);

            // Default Metadatas
            this._selectedMetadata = this._createDefaultMetadata();

            // Create UI
            this._createUI();
        }

        /**
        * Disposes the application
        */
        public dispose(): void {
            this._core.removeEventReceiver(this);

            this._toolbar.destroy();
            this._layouts.destroy();

            this._engine.dispose();
        }

        /**
        * On event
        */
        public onEvent(event: Event): boolean {
            if (event.eventType !== EventType.SCENE_EVENT)
                return;

            if (event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                var object = event.sceneEvent.object;
                if (object instanceof GroundMesh) {
                    this._configureMesh(object);
                }
            }

            return false;
        }

        // Preview mesh
        private _previewMesh(): void {
            if (!this._selectedMesh || !(this._selectedMesh instanceof GroundMesh))
                return;

            // Configure gravity
            this._scene.gravity = this._core.currentScene.gravity;
            this._scene.getPhysicsEngine().setGravity(this._scene.gravity);

            // Apply
            var applied = this._selectedMetadata.applied;
            this._selectedMetadata.applied = true;

            this._extension.apply([this._selectedMetadata]);

            this._selectedMetadata.applied = applied;

            // Store Metadatas
            this._storeMetadatas();
        }

        // Configure mesh
        private _configureMesh(mesh: GroundMesh): void {
            // Dispose mesh
            if (this._selectedMesh) {
                this._selectedMesh.dispose();
                this._selectedMesh = null;

                this._baseMesh = null;

                this._extension.apply([]);
            }

            // Create mesh
            var newMesh = <GroundMesh>Mesh.CreateGround(mesh.name, mesh._width, mesh._height, mesh.subdivisions, this._scene, true);
            newMesh.rotation = mesh.rotation;
            newMesh.rotationQuaternion = mesh.rotationQuaternion;

            if (mesh.material) {
                newMesh.material = Material.Parse(mesh.material.serialize(), this._scene, "file:");
                newMesh.material.backFaceCulling = false;
            }

            this._selectedMesh = newMesh;
            this._baseMesh = mesh;

            // Configure toolbar
            this._toolbar.setItemChecked("APPLIED", false);
            this._toolbar.setItemChecked("HIDE-SPHERES", true);

            var metadatas = this._getMetadatas();

            for (var i = 0; i < metadatas.length; i++) {
                if (metadatas[i].meshName === mesh.name) {
                    this._toolbar.setItemChecked("APPLIED", true);

                    // Configure edit element
                    this._selectedMetadata = metadatas[i];
                    this._buildEditionTool();

                    // Preview
                    this._previewMesh();

                    return;
                }
            }

            this._selectedMetadata = this._createDefaultMetadata();
        }

        // Private draw spheres
        private _drawSpheres(draw: boolean): void {
            var config = this._extension.getConfiguration(this._selectedMesh.name);
            if (!config)
                return;

            for (var i = 0; i < config.spheres.length; i++) {
                config.spheres[i].isVisible = draw;
            }
        }

        // Creates the UI
        private _createUI(): void {
            // Create tab and container
            this._containerID = this._core.editor.createContainer();
            this._tab = this._core.editor.createTab("Soft Body Builder", this._containerID, this, true);
            this._containerElement = $("#" + this._containerID);

            // Layout
            this._layouts = new GUI.GUILayout(this._containerID, this._core);
            this._layouts.createPanel("SOFT-BODY-BUILDER-TOP-PANEL", "top", 45, false).setContent(GUI.GUIElement.CreateElement("div", "SOFT-BODY-BUILDER-TOOLBAR"));
            this._layouts.createPanel("SOFT-BODY-BUILDER-LEFT-PANEL", "left", 300, true).setContent(GUI.GUIElement.CreateElement("div", "SOFT-BODY-BUILDER-TOOLS"));
            this._layouts.createPanel("SOFT-BODY-BUILDER-MAIN-PANEL", "main", 0, false).setContent(GUI.GUIElement.CreateElement("canvas", "SOFT-BODY-BUILDER-PREVIEW"));
            this._layouts.buildElement(this._containerID);

            this._layouts.on("resize", (event) => {
                this._engine.resize();
                this._editTool.resize(this._layouts.getPanelFromType("left").width);
            });

            // Edit tool
            this._buildEditionTool();

            // Toolbar
            this._toolbar = new GUI.GUIToolbar("SOFT-BODY-BUILDER-TOOLBAR", this._core);
            this._toolbar.createMenu("button", "PREVIEW", "Preview", "icon-play-game", false, "Preview the soft body simulation");
            this._toolbar.addBreak();
            this._toolbar.createMenu("button", "APPLIED", "Applied on scene", "icon-scene", false, "If the simulation will be applied on scene");
            this._toolbar.addBreak();
            this._toolbar.createMenu("button", "HIDE-SPHERES", "Hide spheres", "icon-sphere-mesh", false, "Hide the debug spheres");
            this._toolbar.buildElement("SOFT-BODY-BUILDER-TOOLBAR");

            this._toolbar.onClick = (item) => {
                this._storeMetadatas();

                switch (item.parent) {
                    case "PREVIEW": this._configureMesh(this._baseMesh); break;
                    case "APPLIED":
                        var checked = !this._toolbar.isItemChecked(item.parent);
                        this._toolbar.setItemChecked(item.parent, checked);
                        break;
                    case "HIDE-SPHERES":
                        var checked = this._toolbar.isItemChecked(item.parent);
                        this._drawSpheres(checked);
                        this._toolbar.setItemChecked(item.parent, !checked);
                        break;
                }
            };

            // Engine and scene
            this._engine = new Engine(<HTMLCanvasElement>$("#SOFT-BODY-BUILDER-PREVIEW")[0]);
            this._scene = new Scene(this._engine);
            this._camera = new ArcRotateCamera("SoftBodyCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, Vector3.Zero(), this._scene);
            this._light = new PointLight("SoftBodyLight", new Vector3(15, 15, 15), this._scene);
            this._sphere = Mesh.CreateSphere("sphere", 16, 4, this._scene, false);
            this._engine.runRenderLoop(() => this._scene.render());

            this._scene.gravity = this._core.currentScene.gravity;
            this._scene.clearColor = new Color4(0, 0, 0, 1);
            this._scene.defaultMaterial.backFaceCulling = false;

            this._camera.setTarget(Vector3.Zero());
            this._camera.attachControl(this._engine.getRenderingCanvas());

            this._scene.enablePhysics(this._scene.gravity, new CannonJSPlugin());

            this._sphere.position.y = -4;
            this._sphere.isVisible = false;

            // Extension
            this._extension = new EXTENSIONS.SoftBodyBuilderExtension(this._scene);
        }

        // Builds the edition tool
        private _buildEditionTool(): void {
            if (this._editTool)
                this._editTool.remove();
            
            this._editTool = new GUI.GUIEditForm("SOFT-BODY-BUILDER-TOOLS", this._core);
            this._editTool.buildElement("SOFT-BODY-BUILDER-TOOLS");

            var windFolder = this._editTool.addFolder("Wind");
            windFolder.add(this._selectedMetadata, "constantForce").min(0).step(0.1).name("Wind force").onChange(() => this._storeMetadatas());
            windFolder.add(this._selectedMetadata, "constantForceInterval").min(0).step(1).name("Wind force interval").onChange(() => this._storeMetadatas());
            windFolder.add(this._selectedMetadata.constantForceDirection, "x").min(-1).max(1).step(0.01).name("Wind direction x");
            windFolder.add(this._selectedMetadata.constantForceDirection, "y").min(-1).max(1).step(0.01).name("Wind direction y");
            windFolder.add(this._selectedMetadata.constantForceDirection, "z").min(-1).max(1).step(0.01).name("Wind direction z");

            this._editTool.add(this._selectedMetadata, "onlySelectedJoints").name("Only first joints").onChange(() => this._storeMetadatas());
            this._editTool.add(this._selectedMetadata, "firstJoints").min(0).step(1).name("First joints");

            this._editTool.add(this._selectedMetadata, "freeFall").name("Free fall").onFinishChange((value: boolean) => {
                if (value) {
                    this._sphere.setPhysicsState(PhysicsImpostor.SphereImpostor, { mass: 0 });
                }
                else if (this._sphere.getPhysicsImpostor()) {
                    this._sphere.getPhysicsImpostor().dispose();
                    this._sphere.setPhysicsState(PhysicsImpostor.NoImpostor, { mass: 0 });
                }

                this._sphere.isVisible = value;

                this._storeMetadatas();
            });
        }

        // Creates a default Metadatas
        private _createDefaultMetadata(): EXTENSIONS.ISoftBodyData {
            return {
                meshName: "",
                applied: true,
                width: 0,
                height: 0,
                subdivisions: 0,

                onlySelectedJoints: false,
                firstJoints: 1,

                constantForce: 1,
                constantForceInterval: 1000,
                constantForceDirection: Vector3.Zero(),

                freeFall: false
            };
        }

        // Returns the metadatas
        private _getMetadatas(): EXTENSIONS.ISoftBodyData[] {
            var metadatas = SceneManager.GetCustomMetadata<EXTENSIONS.ISoftBodyData[]>("SoftBodyBuilder");

            if (!metadatas) {
                metadatas = [];
                SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
            }

            return metadatas;
        }

        // Stores the Metadatas
        private _storeMetadatas(): void {
            if (!this._baseMesh)
                return;
            
            this._selectedMetadata.meshName = this._baseMesh.name;
            this._selectedMetadata.applied = this._toolbar.isItemChecked("APPLIED");
            this._selectedMetadata.width = this._selectedMesh._width;
            this._selectedMetadata.height = this._selectedMesh._height;
            this._selectedMetadata.subdivisions = this._selectedMesh.subdivisions;

            var metadatas = this._getMetadatas();

            for (var i = 0; i < metadatas.length; i++) {
                if (metadatas[i].meshName === this._selectedMetadata.meshName) {
                    metadatas[i] = this._selectedMetadata;
                    SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
                    return;
                }
            }

            metadatas.push(this._selectedMetadata);
            SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
        }
    }
}
