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
                this._selectedMesh = null;
                this._baseMesh = null;
                this._containerElement = null;
                this._containerID = null;
                this._tab = null;
                this._layouts = null;
                this._toolbar = null;
                this._metadatas = [];
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
                        subdivisions: this._selectedMesh.subdivisions
                    }]);
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
                this._layouts.createPanel("SOFT-BODY-BUILDER-MAIN-PANEL", "main", 0, false).setContent(EDITOR.GUI.GUIElement.CreateElement("canvas", "SOFT-BODY-BUILDER-PREVIEW"));
                this._layouts.buildElement(this._containerID);
                this._layouts.on("resize", function (event) {
                    _this._engine.resize();
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
                            _this._previewMesh();
                            break;
                        case "APPLIED":
                            var checked = !_this._toolbar.isItemChecked(item.parent);
                            _this._toolbar.setItemChecked(item.parent, checked);
                            _this._storeMetadatas();
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
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                this._scene.gravity = this._core.currentScene.gravity;
                this._scene.clearColor = BABYLON.Color3.Black();
                this._scene.defaultMaterial.backFaceCulling = false;
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._scene.enablePhysics(this._scene.gravity, new BABYLON.CannonJSPlugin());
                // Extension
                this._extension = new EDITOR.EXTENSIONS.SoftBodyBuilderExtension(this._scene);
            };
            // Stores the Metadatas
            SoftBodyBuilder.prototype._storeMetadatas = function () {
                var data = {
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
                EDITOR.SceneManager.AddCustomMetadata("SoftBodyBuilder", this._metadatas);
            };
            return SoftBodyBuilder;
        }());
        EDITOR.SoftBodyBuilder = SoftBodyBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.softBodyBuilder.js.map
