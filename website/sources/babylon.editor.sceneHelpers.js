var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneHelpers = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneHelpers(core) {
                // Public members
                this.core = null;
                // Private members
                this._scene = null;
                this._helperPlane = null;
                this._planeMaterial = null;
                this._subMesh = null;
                this._batch = null;
                this._cameraTexture = null;
                this._soundTexture = null;
                this._lightTexture = null;
                //Initialize
                this.core = core;
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Helper
                this.createHelpers(core);
            }
            // Create helpers
            SceneHelpers.prototype.createHelpers = function (core) {
                this._planeMaterial = new BABYLON.StandardMaterial("HelperPlaneMaterial", this._scene);
                this._planeMaterial.emissiveColor = BABYLON.Color3.White();
                this._planeMaterial.useAlphaFromDiffuseTexture = true;
                this._planeMaterial.disableDepthWrite = false;
                this._scene.materials.pop();
                this._cameraTexture = new BABYLON.Texture("css/images/camera.png", this._scene);
                this._cameraTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._soundTexture = new BABYLON.Texture("css/images/sound.png", this._scene);
                this._soundTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._lightTexture = new BABYLON.Texture("css/images/light.png", this._scene);
                this._lightTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._helperPlane = BABYLON.Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
                this._helperPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                this._scene.meshes.pop();
                this._helperPlane.material = this._planeMaterial;
            };
            // On pre update
            SceneHelpers.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this.core.currentScene.activeCamera;
            };
            // On post update
            SceneHelpers.prototype.onPostUpdate = function () {
                //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);
                var _this = this;
                if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                    return;
                var engine = this._scene.getEngine();
                engine.setAlphaTesting(true);
                this._subMesh = this._helperPlane.subMeshes[0];
                if (this._planeMaterial.isReadyForSubMesh(this._helperPlane, this._subMesh, true)) {
                    var effect = this._subMesh.effect;
                    if (!effect)
                        return;
                    this._batch = this._helperPlane._getInstancesRenderList(this._subMesh._id);
                    engine.enableEffect(effect);
                    this._helperPlane._bind(this._subMesh, effect, BABYLON.Material.TriangleFillMode);
                    // Cameras
                    this._planeMaterial.diffuseTexture = this._cameraTexture;
                    this._renderHelperPlane(this.core.currentScene.cameras, function (obj) {
                        if (obj === _this.core.currentScene.activeCamera)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.position);
                        return true;
                    });
                    // Sounds
                    this._planeMaterial.diffuseTexture = this._soundTexture;
                    for (var i = 0; i < this.core.currentScene.soundTracks.length; i++) {
                        var soundTrack = this.core.currentScene.soundTracks[i];
                        this._renderHelperPlane(soundTrack.soundCollection, function (obj) {
                            if (!obj.spatialSound)
                                return false;
                            _this._helperPlane.position.copyFrom(obj._position);
                            return true;
                        });
                    }
                    // Lights
                    this._planeMaterial.diffuseTexture = this._lightTexture;
                    this._renderHelperPlane(this.core.currentScene.lights, function (obj) {
                        if (!obj.getAbsolutePosition)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.getAbsolutePosition());
                        return true;
                    });
                }
            };
            // Returns the scene
            SceneHelpers.prototype.getScene = function () {
                return this._scene;
            };
            // Render planes
            SceneHelpers.prototype._renderHelperPlane = function (array, onConfigure) {
                var effect = this._subMesh.effect;
                for (var i = 0; i < array.length; i++) {
                    var obj = array[i];
                    if (!onConfigure(obj))
                        continue;
                    var distance = BABYLON.Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                    this._helperPlane.scaling = new BABYLON.Vector3(distance, distance, distance),
                        this._helperPlane.computeWorldMatrix(true);
                    this._scene._cachedMaterial = null;
                    this._planeMaterial._preBind(effect);
                    this._planeMaterial.bindForSubMesh(this._helperPlane.getWorldMatrix(), this._helperPlane, this._subMesh);
                    this._helperPlane._processRendering(this._subMesh, effect, BABYLON.Material.TriangleFillMode, this._batch, false, function (isInstance, world) {
                        effect.setMatrix("world", world);
                    });
                }
            };
            return SceneHelpers;
        }());
        EDITOR.SceneHelpers = SceneHelpers;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.sceneHelpers.js.map
