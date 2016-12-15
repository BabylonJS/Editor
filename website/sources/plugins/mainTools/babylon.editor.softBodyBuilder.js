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
                this._selectedMesh = null;
                this._baseMesh = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._toolbar = null;
                this._editTool = null;
                this._metadatas = [];
                this._windForce = 1;
                this._windForceInterval = 1000; // in ms
                this._windDirection = BABYLON.Vector3.Zero();
                this._freeFall = false;
                this._onlySelectedJoints = false;
                this._selectedJointsCount = 1;
                // Configure this
                this._core = core;
                core.eventReceivers.push(this);
                // Metadatas
                this._metadatas = EDITOR.SceneManager.GetCustomMetadata("SoftBodyBuilder") || [];
                if (!this._metadatas)
                    EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", this._metadatas);
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
                this._extension.apply([{
                        meshName: this._selectedMesh.name,
                        applied: true,
                        width: this._selectedMesh._width,
                        height: this._selectedMesh._height,
                        subdivisions: this._selectedMesh.subdivisions,
                        onlySelectedJoints: this._onlySelectedJoints,
                        firstJoints: this._selectedJointsCount,
                        constantForce: this._windForce,
                        constantForceInterval: this._windForceInterval,
                        constantForceDirection: this._windDirection,
                        freeFall: this._freeFall
                    }]);
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
                var newMesh = BABYLON.Mesh.CreateGround("SoftBodyMesh", mesh._width, mesh._height, mesh.subdivisions, this._scene, true);
                newMesh.rotation = mesh.rotation;
                newMesh.rotationQuaternion = mesh.rotationQuaternion;
                if (mesh.material) {
                    newMesh.material = BABYLON.Material.Parse(mesh.material.serialize(), this._scene, "file:");
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
                        // Configure edit element
                        this._windForce = this._metadatas[i].constantForce;
                        this._windForceInterval = this._metadatas[i].constantForceInterval;
                        this._windDirection = this._metadatas[i].constantForceDirection;
                        this._onlySelectedJoints = this._metadatas[i].onlySelectedJoints;
                        this._selectedJointsCount = this._metadatas[i].firstJoints;
                        this._freeFall = this._metadatas[i].freeFall;
                        this._editTool.updatePropertyValue("_windForce", this._windForce, "Wind");
                        this._editTool.updatePropertyValue("_windForceInterval", this._windForceInterval, "Wind");
                        this._editTool.updatePropertyValue("x", this._windDirection.x, "Wind");
                        this._editTool.updatePropertyValue("y", this._windDirection.y, "Wind");
                        this._editTool.updatePropertyValue("z", this._windDirection.z, "Wind");
                        this._editTool.updatePropertyValue("_freeFall", this._freeFall);
                        this._editTool.updatePropertyValue("_onlySelectedJoints", this._onlySelectedJoints);
                        this._editTool.updatePropertyValue("_selectedJointsCount", this._selectedJointsCount);
                        // Preview
                        this._previewMesh();
                        return;
                    }
                }
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
                this._editTool = new EDITOR.GUI.GUIEditForm("SOFT-BODY-BUILDER-TOOLS", this._core);
                this._editTool.buildElement("SOFT-BODY-BUILDER-TOOLS");
                var windFolder = this._editTool.addFolder("Wind");
                windFolder.add(this, "_windForce").min(0).step(0.1).name("Wind force").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this, "_windForceInterval").min(0).step(1).name("Wind force interval").onChange(function () { return _this._storeMetadatas(); });
                windFolder.add(this._windDirection, "x").min(-1).max(1).step(0.01).name("Wind direction x");
                windFolder.add(this._windDirection, "y").min(-1).max(1).step(0.01).name("Wind direction y");
                windFolder.add(this._windDirection, "z").min(-1).max(1).step(0.01).name("Wind direction z");
                this._editTool.add(this, "_onlySelectedJoints").name("Only one joint").onChange(function () { return _this._storeMetadatas(); });
                this._editTool.add(this, "_selectedJointsCount").min(0).step(1).name("Selected joints");
                this._editTool.add(this, "_freeFall").name("Free fall").onFinishChange(function (value) {
                    if (value) {
                        _this._sphere.setPhysicsState(BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0 });
                    }
                    else if (_this._sphere.getPhysicsImpostor()) {
                        _this._sphere.getPhysicsImpostor().dispose();
                        _this._sphere.setPhysicsState(BABYLON.PhysicsImpostor.NoImpostor, { mass: 0 });
                    }
                    _this._sphere.isVisible = value;
                    _this._storeMetadatas();
                });
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
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                this._scene.gravity = this._core.currentScene.gravity;
                this._scene.clearColor = BABYLON.Color3.Black();
                this._scene.defaultMaterial.backFaceCulling = false;
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._scene.enablePhysics(this._scene.gravity, new BABYLON.CannonJSPlugin());
                this._sphere.position.y = -4;
                this._sphere.isVisible = false;
                // Extension
                this._extension = new EDITOR.EXTENSIONS.SoftBodyBuilderExtension(this._scene);
            };
            // Stores the Metadatas
            SoftBodyBuilder.prototype._storeMetadatas = function () {
                if (!this._baseMesh)
                    return;
                var data = {
                    meshName: this._baseMesh.name,
                    applied: this._toolbar.isItemChecked("APPLIED"),
                    width: this._selectedMesh._width,
                    height: this._selectedMesh._height,
                    subdivisions: this._selectedMesh.subdivisions,
                    onlySelectedJoints: this._onlySelectedJoints,
                    firstJoints: this._selectedJointsCount,
                    constantForce: this._windForce,
                    constantForceInterval: this._windForceInterval,
                    constantForceDirection: this._windDirection,
                    freeFall: this._freeFall
                };
                for (var i = 0; i < this._metadatas.length; i++) {
                    if (this._metadatas[i].meshName === data.meshName) {
                        this._metadatas[i] = data;
                        return;
                    }
                }
                this._metadatas.push(data);
                EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", this._metadatas);
            };
            return SoftBodyBuilder;
        }());
        EDITOR.SoftBodyBuilder = SoftBodyBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.softBodyBuilder.js.map
