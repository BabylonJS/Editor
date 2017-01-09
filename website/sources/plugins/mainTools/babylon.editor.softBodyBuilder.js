var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SoftBodyBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function SoftBodyBuilder(core) {
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._light = null;
                this._sphere = null;
                this._plane = null;
                this._selectedMesh = null;
                this._baseMesh = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._toolbar = null;
                this._editTool = null;
                this._useFreeFallSphere = false;
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
            SoftBodyBuilder.prototype.dispose = function () {
                this._core.removeEventReceiver(this);
                this._toolbar.destroy();
                this._layouts.destroy();
                this._engine.dispose();
            };
            /**
            * On event
            */
            SoftBodyBuilder.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.SCENE_EVENT)
                    return;
                if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                    var object = event.sceneEvent.object;
                    if (object instanceof BABYLON.GroundMesh) {
                        this._configureMesh(object);
                    }
                }
                return false;
            };
            // Preview mesh
            SoftBodyBuilder.prototype._previewMesh = function () {
                if (!this._selectedMesh || !(this._selectedMesh instanceof BABYLON.GroundMesh))
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
            };
            // Configure mesh
            SoftBodyBuilder.prototype._configureMesh = function (mesh) {
                // Dispose mesh
                if (this._selectedMesh) {
                    this._selectedMesh.dispose();
                    this._selectedMesh = null;
                    this._baseMesh = null;
                    this._extension.apply([]);
                }
                // Create mesh
                var newMesh = BABYLON.Mesh.CreateGround(mesh.name, mesh._width, mesh._height, mesh.subdivisions, this._scene, true);
                newMesh.rotation = mesh.rotation;
                newMesh.rotationQuaternion = mesh.rotationQuaternion;
                this._plane.position.y = -newMesh._height - 3;
                if (mesh.material) {
                    newMesh.material = BABYLON.Material.Parse(mesh.material.serialize(), this._scene, "file:");
                    newMesh.material.backFaceCulling = false;
                    newMesh.material.zOffset = -40;
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
            };
            // Private draw spheres
            SoftBodyBuilder.prototype._drawSpheres = function (draw) {
                var config = this._extension.getConfiguration(this._selectedMesh.name);
                if (!config)
                    return;
                for (var i = 0; i < config.spheres.length; i++) {
                    config.spheres[i].isVisible = draw;
                }
            };
            // Creates the UI
            SoftBodyBuilder.prototype._createUI = function () {
                var _this = this;
                // Create tab and container
                this._containerID = this._core.editor.createContainer();
                this._tab = this._core.editor.createTab("Soft Body Builder", this._containerID, this, true);
                this._containerElement = $("#" + this._containerID);
                // Layout
                this._layouts = new EDITOR.GUI.GUILayout(this._containerID, this._core);
                this._layouts.createPanel("SOFT-BODY-BUILDER-TOP-PANEL", "top", 45, false).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "SOFT-BODY-BUILDER-TOOLBAR"));
                this._layouts.createPanel("SOFT-BODY-BUILDER-LEFT-PANEL", "left", 300, true).setContent(EDITOR.GUI.GUIElement.CreateElement("div", "SOFT-BODY-BUILDER-TOOLS"));
                this._layouts.createPanel("SOFT-BODY-BUILDER-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "SOFT-BODY-BUILDER-PREVIEW"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._engine.resize();
                    _this._editTool.resize(_this._layouts.getPanelFromType("left").width);
                });
                // Edit tool
                this._buildEditionTool();
                // Toolbar
                this._toolbar = new EDITOR.GUI.GUIToolbar("SOFT-BODY-BUILDER-TOOLBAR", this._core);
                this._toolbar.createMenu("button", "PREVIEW", "Preview", "icon-play-game", false, "Preview the soft body simulation");
                this._toolbar.addBreak();
                this._toolbar.createMenu("button", "APPLIED", "Applied on scene", "icon-scene", false, "If the simulation will be applied on scene");
                this._toolbar.addBreak();
                this._toolbar.createMenu("button", "HIDE-SPHERES", "Hide spheres", "icon-sphere-mesh", false, "Hide the debug spheres");
                this._toolbar.buildElement("SOFT-BODY-BUILDER-TOOLBAR");
                this._toolbar.onClick = function (item) {
                    _this._storeMetadatas();
                    switch (item.parent) {
                        case "PREVIEW":
                            _this._configureMesh(_this._baseMesh);
                            break;
                        case "APPLIED":
                            var checked = !_this._toolbar.isItemChecked(item.parent);
                            _this._toolbar.setItemChecked(item.parent, checked);
                            break;
                        case "HIDE-SPHERES":
                            var checked = _this._toolbar.isItemChecked(item.parent);
                            _this._drawSpheres(checked);
                            _this._toolbar.setItemChecked(item.parent, !checked);
                            break;
                    }
                };
                // Engine and scene
                this._engine = new BABYLON.Engine($("#SOFT-BODY-BUILDER-PREVIEW")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.ArcRotateCamera("SoftBodyCamera", 3 * Math.PI / 2, -3 * Math.PI / 2, 20, BABYLON.Vector3.Zero(), this._scene);
                this._light = new BABYLON.PointLight("SoftBodyLight", new BABYLON.Vector3(15, 15, 15), this._scene);
                this._sphere = BABYLON.Mesh.CreateSphere("sphere", 16, 4, this._scene, false);
                this._plane = BABYLON.Mesh.CreateBox("SoftBodyPlane", 100, this._scene); // Mesh.CreateGround("SoftBodyPlane", 100, 100, 2, this._scene);
                this._plane.scaling.y = 0.001;
                var planeMaterial = new BABYLON.GridMaterial("grid", this._scene);
                planeMaterial.gridRatio = 0.1;
                this._plane.material = planeMaterial;
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                this._scene.gravity = this._core.currentScene.gravity;
                this._scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
                this._scene.defaultMaterial.backFaceCulling = false;
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._scene.enablePhysics(this._scene.gravity, new BABYLON.CannonJSPlugin());
                this._plane.setPhysicsState(BABYLON.PhysicsEngine.BoxImpostor, { mass: 0 });
                this._sphere.position.y = -4;
                this._sphere.isVisible = false;
                // Extension
                this._extension = new EDITOR.EXTENSIONS.SoftBodyBuilderExtension(this._scene);
            };
            // Builds the edition tool
            SoftBodyBuilder.prototype._buildEditionTool = function () {
                var _this = this;
                if (this._editTool)
                    this._editTool.remove();
                this._editTool = new EDITOR.GUI.GUIEditForm("SOFT-BODY-BUILDER-TOOLS", this._core);
                this._editTool.buildElement("SOFT-BODY-BUILDER-TOOLS");
                var windFolder = this._editTool.addFolder("Wind");
                windFolder.add(this._selectedMetadata, "constantForce").min(0).step(0.1).name("Wind force").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this._selectedMetadata, "constantForceInterval").min(0).step(1).name("Wind force interval").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this._selectedMetadata.constantForceDirection, "x").min(-1).max(1).step(0.01).name("Wind direction x").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this._selectedMetadata.constantForceDirection, "y").min(-1).max(1).step(0.01).name("Wind direction y").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this._selectedMetadata.constantForceDirection, "z").min(-1).max(1).step(0.01).name("Wind direction z").onChange(function () { return _this._storeMetadatas(); });
                var fixedJoints = this._editTool.addFolder("Fixed Joints");
                fixedJoints.add(this._selectedMetadata, "onlySelectedJoints").name("Select fixed joints").onChange(function () { return _this._storeMetadatas(); });
                fixedJoints.add(this._selectedMetadata, "firstJoints").min(0).step(1).name("First fixed joints").onChange(function () { return _this._storeMetadatas(); });
                var freeFallFolder = this._editTool.addFolder("Free Fall");
                freeFallFolder.add(this, "_useFreeFallSphere").name("Use Sphere Impostor").onFinishChange(function (value) {
                    if (value) {
                        _this._sphere.setPhysicsState(BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0 });
                    }
                    else if (_this._sphere.getPhysicsImpostor()) {
                        _this._sphere.getPhysicsImpostor().dispose();
                    }
                    _this._sphere.isVisible = value;
                    _this._useFreeFallSphere = value;
                });
                freeFallFolder.add(this._selectedMetadata, "freeFall").name("Free fall").onFinishChange(function (value) {
                    _this._selectedMetadata.freeFall = value;
                    _this._storeMetadatas();
                });
                var miscFolder = this._editTool.addFolder("Misc");
                miscFolder.add(this._selectedMetadata, "distanceFactor").step(0.01).name("Distance factor");
            };
            // Creates a default Metadatas
            SoftBodyBuilder.prototype._createDefaultMetadata = function () {
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
                    constantForceDirection: BABYLON.Vector3.Zero(),
                    freeFall: false,
                    distanceFactor: 1
                };
            };
            // Returns the metadatas
            SoftBodyBuilder.prototype._getMetadatas = function () {
                var metadatas = EDITOR.SceneManager.GetCustomMetadata("SoftBodyBuilder");
                if (!metadatas) {
                    metadatas = [];
                    EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
                }
                return metadatas;
            };
            // Stores the Metadatas
            SoftBodyBuilder.prototype._storeMetadatas = function () {
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
                        EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
                        return;
                    }
                }
                metadatas.push(this._selectedMetadata);
                EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", metadatas);
            };
            return SoftBodyBuilder;
        }());
        EDITOR.SoftBodyBuilder = SoftBodyBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.softBodyBuilder.js.map
