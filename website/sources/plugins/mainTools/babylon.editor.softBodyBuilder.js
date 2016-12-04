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
                var object = event.sceneEvent.object;
                if (object instanceof BABYLON.GroundMesh) {
                    this._configureMesh(object);
                }
                return false;
            };
            // Preview mesh
            SoftBodyBuilder.prototype._previewMesh = function () {
                if (!this._selectedMesh || !(this._selectedMesh instanceof BABYLON.GroundMesh))
                    return;
                this._extension.apply([{
                        meshName: this._selectedMesh.name
                    }]);
            };
            // Configure mesh
            SoftBodyBuilder.prototype._configureMesh = function (mesh) {
                if (this._selectedMesh) {
                    this._selectedMesh.dispose();
                    this._selectedMesh = null;
                    this._extension.apply([]);
                }
                var newMesh = BABYLON.Mesh.CreateGround("SoftBodyMesh", mesh._width, mesh._height, mesh.subdivisions, this._scene, true);
                if (mesh.material)
                    newMesh.material = BABYLON.Material.Parse(mesh.material.serialize(), this._scene, "file:");
                this._selectedMesh = newMesh;
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
                this._toolbar.createMenu("button", "DRAW-SPHERES", "Draw spheres", "icon-sphere-mesh", false, "If the spheres should be drawn");
                this._toolbar.buildElement("SOFT-BODY-BUILDER-TOOLBAR");
                this._toolbar.onClick = function (item) {
                    switch (item.parent) {
                        case "PREVIEW":
                            _this._previewMesh();
                            break;
                        case "APPLIED": break;
                    }
                };
                // Engine and scene
                this._engine = new BABYLON.Engine($("#SOFT-BODY-BUILDER-PREVIEW")[0]);
                this._scene = new BABYLON.Scene(this._engine);
                this._camera = new BABYLON.ArcRotateCamera("SoftBodyCamera", 3 * Math.PI / 2, Math.PI / 2, 20, BABYLON.Vector3.Zero(), this._scene);
                this._light = new BABYLON.PointLight("SoftBodyLight", new BABYLON.Vector3(15, 15, 15), this._scene);
                this._engine.runRenderLoop(function () { return _this._scene.render(); });
                // this._scene.clearColor = Color3.Black();
                this._camera.setTarget(BABYLON.Vector3.Zero());
                this._camera.attachControl(this._engine.getRenderingCanvas());
                this._scene.enablePhysics(this._scene.gravity, new BABYLON.CannonJSPlugin());
                // Extension
                this._extension = new EDITOR.EXTENSIONS.SoftBodyBuilderExtension(this._scene);
            };
            return SoftBodyBuilder;
        }());
        EDITOR.SoftBodyBuilder = SoftBodyBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.softBodyBuilder.js.map
