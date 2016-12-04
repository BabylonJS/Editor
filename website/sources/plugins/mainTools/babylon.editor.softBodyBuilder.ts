module BABYLON.EDITOR {
    export class SoftBodyBuilder implements ITabApplication, IEventReceiver {
        // Public members

        // Private members
        private _core: EditorCore;

        private _engine: Engine = null;
        private _scene: Scene = null;
        private _camera: ArcRotateCamera = null;
        private _light: PointLight = null;

        private _selectedMesh: GroundMesh = null;
        private _baseMesh: GroundMesh = null;

        private _containerElement: JQuery = null;
        private _containerID: string = null;
        private _tab: GUI.IGUITab = null;

        private _layouts: GUI.GUILayout = null;
        private _toolbar: GUI.GUIToolbar = null;

        private _extension: EDITOR.EXTENSIONS.SoftBodyBuilderExtension;
        private _metadatas: EXTENSIONS.ISoftBodyData[] = [];

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
            core.eventReceivers.push(this);

            // Metadatas
            this._metadatas = SceneManager.GetCustomMetadata<EXTENSIONS.ISoftBodyData[]>("SoftBodyBuilder") || [];
            if (!this._metadatas )
                SceneManager.AddCustomMetadata("SoftBodyBuilder", this._metadatas );

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

            var object = event.sceneEvent.object;
            if (object instanceof GroundMesh) {
                this._configureMesh(object);
            }

            return false;
        }

        // Preview mesh
        private _previewMesh(): void {
            if (!this._selectedMesh || !(this._selectedMesh instanceof GroundMesh))
                return;

            this._extension.apply([{
                meshName: this._selectedMesh.name,
                applied: true,
                width: this._selectedMesh._width,
                height: this._selectedMesh._height,
                subdivisions: this._selectedMesh.subdivisions
            }]);
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
            var newMesh = <GroundMesh>Mesh.CreateGround("SoftBodyMesh", mesh._width, mesh._height, mesh.subdivisions, this._scene, true);

            if (mesh.material) {
                newMesh.material = Material.Parse(mesh.material.serialize(), this._scene, "file:");
                newMesh.material.backFaceCulling = false;
            }

            this._selectedMesh = newMesh;
            this._baseMesh = mesh;

            // Configure toolbar
            this._toolbar.setItemChecked("APPLIED", false);
            this._toolbar.setItemChecked("HIDE-SPHERES", true);

            for (var i = 0; i < this._metadatas.length; i++) {
                if (this._metadatas[i].meshName === mesh.name) {
                    this._toolbar.setItemChecked("APPLIED", true);
                    this._previewMesh();
                    return;
                }
            }
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
            this._layouts.createPanel("SOFT-BODY-BUILDER-MAIN-PANEL", "main", 0, false).setContent(GUI.GUIElement.CreateElement("canvas", "SOFT-BODY-BUILDER-PREVIEW"));
            this._layouts.buildElement(this._containerID);

            this._layouts.on("resize", (event) => {
                this._engine.resize();
            });

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
                    case "PREVIEW": this._previewMesh(); break;
                    case "APPLIED":
                        var checked = !this._toolbar.isItemChecked(item.parent);
                        this._toolbar.setItemChecked(item.parent, checked);
                        this._storeMetadatas();
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
            this._engine.runRenderLoop(() => this._scene.render());

            this._scene.clearColor = Color3.Black();
            this._scene.defaultMaterial.backFaceCulling = false;
            
            this._camera.setTarget(Vector3.Zero());
            this._camera.attachControl(this._engine.getRenderingCanvas());

            this._scene.enablePhysics(this._scene.gravity, new CannonJSPlugin());

            // Extension
            this._extension = new EXTENSIONS.SoftBodyBuilderExtension(this._scene);
        }

        // Stores the Metadatas
        private _storeMetadatas(): void {
            var data: EXTENSIONS.ISoftBodyData = {
                meshName: this._baseMesh.name,
                applied: this._toolbar.isItemChecked("APPLIED"),
                width: this._selectedMesh._width,
                height: this._selectedMesh._height,
                subdivisions: this._selectedMesh.subdivisions
            };

            for (var i = 0; i < this._metadatas.length; i++) {
                if (this._metadatas[i].meshName === data.meshName) {
                    this._metadatas[i] = data;
                    return;
                }
            }

            this._metadatas.push(data);
            SceneManager.AddCustomMetadata("SoftBodyBuilder", this._metadatas);
        }
    }
}
