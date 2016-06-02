var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        (function (TransformerType) {
            TransformerType[TransformerType["POSITION"] = 0] = "POSITION";
            TransformerType[TransformerType["ROTATION"] = 1] = "ROTATION";
            TransformerType[TransformerType["SCALING"] = 2] = "SCALING";
            TransformerType[TransformerType["NOTHING"] = 3] = "NOTHING";
        })(EDITOR.TransformerType || (EDITOR.TransformerType = {}));
        var TransformerType = EDITOR.TransformerType;
        var Transformer = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Transformer(core) {
                var _this = this;
                // Public members
                this.core = null;
                // Private members
                this._scene = null;
                this._node = null;
                this._helperPlane = null;
                this._planeMaterial = null;
                this._subMesh = null;
                this._batch = null;
                this._cameraTexture = null;
                this._soundTexture = null;
                this._lightTexture = null;
                this._transformerType = TransformerType.POSITION;
                this._xTransformers = new Array();
                this._yTransformers = new Array();
                this._zTransformers = new Array();
                this._sharedScale = BABYLON.Vector3.Zero();
                this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up());
                this._mousePosition = BABYLON.Vector3.Zero();
                this._mouseDown = false;
                this._pickPosition = true;
                this._pickingInfo = null;
                this._vectorToModify = null;
                this._selectedTransform = "";
                this._distance = 0;
                this._multiplier = 20;
                this._ctrlIsDown = false;
                //Initialize
                this.core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Create events
                core.canvas.addEventListener("mousedown", function (ev) {
                    _this._mouseDown = true;
                });
                core.canvas.addEventListener("mouseup", function (ev) {
                    _this._mouseDown = false;
                    _this._pickPosition = true;
                    if (_this._pickingInfo) {
                        var material = _this._pickingInfo.pickedMesh.material;
                        material.emissiveColor = material.emissiveColor.multiply(new BABYLON.Color3(1.5, 1.5, 1.5));
                    }
                    _this._pickingInfo = null;
                    core.currentScene.activeCamera.attachControl(core.canvas);
                    if (_this._node)
                        EDITOR.Event.sendSceneEvent(_this._node, EDITOR.SceneEventType.OBJECT_CHANGED, core);
                });
                $(window).keydown(function (event) {
                    if (event.ctrlKey && _this._ctrlIsDown === false) {
                        _this._multiplier = 1;
                        _this._ctrlIsDown = true;
                        _this._pickPosition = true;
                    }
                });
                $(window).keyup(function (event) {
                    if (!event.ctrlKey && _this._ctrlIsDown === true) {
                        _this._multiplier = 10;
                        _this._ctrlIsDown = false;
                        _this._pickPosition = true;
                    }
                });
                // Create Transformers
                this._createTransformers();
                // Helper
                this.createHelpers(core);
            }
            // Create helpers
            Transformer.prototype.createHelpers = function (core) {
                this._planeMaterial = new BABYLON.StandardMaterial("HelperPlaneMaterial", this._scene);
                this._planeMaterial.emissiveColor = BABYLON.Color3.White();
                this._planeMaterial.useAlphaFromDiffuseTexture = true;
                this._planeMaterial.disableDepthWrite = false;
                this._scene.materials.pop();
                this._cameraTexture = new BABYLON.Texture("../css/images/camera.png", this._scene);
                this._cameraTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._soundTexture = new BABYLON.Texture("../css/images/sound.png", this._scene);
                this._soundTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._lightTexture = new BABYLON.Texture("../css/images/light.png", this._scene);
                this._lightTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._helperPlane = BABYLON.Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
                this._helperPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                this._scene.meshes.pop();
                this._helperPlane.material = this._planeMaterial;
            };
            // Event receiver
            Transformer.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        if (event.sceneEvent.data === this._node) {
                            this._node = null;
                            return false;
                        }
                    }
                    else if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                        if (event.sceneEvent.object)
                            this._node = event.sceneEvent.object;
                        else
                            this._node = null;
                        return false;
                    }
                }
                return false;
            };
            // On pre update
            Transformer.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this.core.currentScene.activeCamera;
                // Compute node
                var node = this._node;
                if (!node)
                    return;
                // Set transformer scale
                var distance = 0;
                if (!this.core.isPlaying) {
                    distance = BABYLON.Vector3.Distance(this._scene.activeCamera.position, this._xTransformers[0].position) * 0.03;
                }
                var scale = new BABYLON.Vector3(distance, distance, distance).divide(new BABYLON.Vector3(3, 3, 3));
                this._sharedScale.x = scale.x;
                this._sharedScale.y = scale.y;
                this._sharedScale.z = scale.z;
                this._distance = distance;
                // Update transformer (position is particular)
                var position = this._getNodePosition();
                if (!position)
                    return;
                this._xTransformers[0].position.copyFrom(position);
                this._yTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._zTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[0].position.y += distance * 1.3;
                this._zTransformers[0].position.z += distance * 1.3;
                this._xTransformers[0].position.x += distance * 1.3;
                this._xTransformers[1].position.copyFrom(position);
                this._yTransformers[1].position.copyFrom(position);
                this._zTransformers[1].position.copyFrom(position);
                this._xTransformers[2].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[2].position.copyFrom(this._yTransformers[0].position);
                this._zTransformers[2].position.copyFrom(this._zTransformers[0].position);
                // Finish Transformer
                if (this._mouseDown)
                    this._updateTransform(distance);
            };
            // On post update
            Transformer.prototype.onPostUpdate = function () {
                //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);
                var _this = this;
                if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                    return;
                var engine = this._scene.getEngine();
                engine.setAlphaTesting(true);
                if (this._planeMaterial.isReady(this._helperPlane)) {
                    this._subMesh = this._helperPlane.subMeshes[0];
                    var effect = this._planeMaterial.getEffect();
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
            Object.defineProperty(Transformer.prototype, "transformerType", {
                // Get transformer type (POSITION, ROTATION or SCALING)
                get: function () {
                    return this._transformerType;
                },
                // Set transformer type
                set: function (type) {
                    this._transformerType = type;
                    // Hide all
                    for (var i = 0; i < TransformerType.NOTHING; i++) {
                        this._xTransformers[i].setEnabled(false);
                        this._yTransformers[i].setEnabled(false);
                        this._zTransformers[i].setEnabled(false);
                    }
                    if (type !== TransformerType.NOTHING) {
                        this._xTransformers[type].setEnabled(true);
                        this._yTransformers[type].setEnabled(true);
                        this._zTransformers[type].setEnabled(true);
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transformer.prototype, "node", {
                // Get the node to transform
                get: function () {
                    return this._node;
                },
                // Set node to transform
                set: function (node) {
                    this._node = node;
                },
                enumerable: true,
                configurable: true
            });
            // Returns the scene
            Transformer.prototype.getScene = function () {
                return this._scene;
            };
            // Returns the node position
            Transformer.prototype._getNodePosition = function () {
                var node = this._node;
                var position = null;
                /*
                if (node.getBoundingInfo && node.geometry) {
                    position = node.getBoundingInfo().boundingSphere.centerWorld;
                }
                else */ if (node._position) {
                    position = node._position;
                }
                else if (node.position) {
                    position = node.position;
                }
                return position;
            };
            // Render planes
            Transformer.prototype._renderHelperPlane = function (array, onConfigure) {
                var effect = this._planeMaterial.getEffect();
                for (var i = 0; i < array.length; i++) {
                    var obj = array[i];
                    if (!onConfigure(obj))
                        continue;
                    var distance = BABYLON.Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                    this._helperPlane.scaling = new BABYLON.Vector3(distance, distance, distance),
                        this._helperPlane.computeWorldMatrix(true);
                    this._scene._cachedMaterial = null;
                    this._planeMaterial.bind(this._helperPlane.getWorldMatrix(), this._helperPlane);
                    this._helperPlane._processRendering(this._subMesh, effect, BABYLON.Material.TriangleFillMode, this._batch, false, function (isInstance, world) {
                        effect.setMatrix("world", world);
                    });
                }
            };
            // Updates the transformer (picking + manage movements)
            Transformer.prototype._updateTransform = function (distance) {
                if (this._pickingInfo === null) {
                    // Pick
                    var pickInfo = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
                    if (!pickInfo.hit && this._pickingInfo === null)
                        return;
                    if (pickInfo.hit && this._pickingInfo === null)
                        this._pickingInfo = pickInfo;
                }
                var mesh = this._pickingInfo.pickedMesh.parent || this._pickingInfo.pickedMesh;
                var node = this._node;
                var position = this._getNodePosition();
                if (this._pickPosition) {
                    // Setup planes
                    if (this._xTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(0, 0, -1));
                        this._selectedTransform = "x";
                    }
                    else if (this._yTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(-1, 0, 0));
                        this._selectedTransform = "y";
                    }
                    else if (this._zTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(0, -1, 0));
                        this._selectedTransform = "z";
                    }
                    this.core.currentScene.activeCamera.detachControl(this.core.canvas);
                    if (this._findMousePositionInPlane(this._pickingInfo)) {
                        this._mousePosition.copyFrom(this._mousePositionInPlane);
                        if (this._transformerType === TransformerType.POSITION) {
                            this._mousePosition = this._mousePosition.subtract(position);
                            this._vectorToModify = this._getNodePosition();
                        }
                        else if (this._transformerType === TransformerType.SCALING && node.scaling) {
                            this._mousePosition = this._mousePosition.subtract(node.scaling);
                            this._vectorToModify = node.scaling;
                        }
                        else if (this._transformerType === TransformerType.ROTATION && (node.rotation || node.direction)) {
                            this._vectorToModify = node.direction || node.rotation;
                            this._mousePosition = this._mousePosition.subtract(this._vectorToModify);
                        }
                        else {
                            this._vectorToModify = null;
                        }
                        // TODO
                        // Change transformer color...
                        mesh.material.emissiveColor = mesh.material.emissiveColor.multiply(new BABYLON.Color3(0.5, 0.5, 0.5));
                        this._pickPosition = false;
                    }
                }
                // Now, time to update
                if (!this._vectorToModify)
                    return;
                if (this._findMousePositionInPlane(this._pickingInfo)) {
                    if (this._selectedTransform === "x") {
                        this._vectorToModify.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                    }
                    else if (this._selectedTransform === "y") {
                        this._vectorToModify.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                    }
                    else if (this._selectedTransform === "z") {
                        this._vectorToModify.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                    }
                    if (this._node instanceof BABYLON.Sound) {
                        this._node.setPosition(this._vectorToModify);
                    }
                }
            };
            // Returns if the ray intersects the transformer plane
            Transformer.prototype._getIntersectionWithLine = function (linePoint, lineVect) {
                var t2 = BABYLON.Vector3.Dot(this._pickingPlane.normal, lineVect);
                if (t2 === 0)
                    return false;
                var t = -(BABYLON.Vector3.Dot(this._pickingPlane.normal, linePoint) + this._pickingPlane.d) / t2;
                this._mousePositionInPlane = linePoint.add(lineVect).multiplyByFloats(this._multiplier, this._multiplier, this._multiplier);
                return true;
            };
            // Fins the mouse position in plane
            Transformer.prototype._findMousePositionInPlane = function (pickingInfos) {
                var ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, BABYLON.Matrix.Identity(), this._scene.activeCamera);
                if (this._getIntersectionWithLine(ray.origin, ray.direction))
                    return true;
                return false;
            };
            // Create transformers
            Transformer.prototype._createTransformers = function () {
                var colors = [
                    new BABYLON.Color3(1, 0, 0),
                    new BABYLON.Color3(0, 1, 0),
                    new BABYLON.Color3(0, 0, 1)
                ];
                var x = null;
                var y = null;
                var z = null;
                // Position
                x = this._createPositionTransformer(colors[0], TransformerType.POSITION);
                y = this._createPositionTransformer(colors[1], TransformerType.POSITION);
                z = this._createPositionTransformer(colors[2], TransformerType.POSITION);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Rotation
                x = this._createRotationTransformer(colors[0], TransformerType.ROTATION);
                y = this._createRotationTransformer(colors[1], TransformerType.ROTATION);
                z = this._createRotationTransformer(colors[2], TransformerType.ROTATION);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Scaling
                x = this._createScalingTransformer(colors[0], TransformerType.SCALING);
                y = this._createScalingTransformer(colors[1], TransformerType.SCALING);
                z = this._createScalingTransformer(colors[2], TransformerType.SCALING);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Finish
                for (var i = 0; i < TransformerType.NOTHING; i++) {
                    this._xTransformers[i].setEnabled(false);
                    this._yTransformers[i].setEnabled(false);
                    this._zTransformers[i].setEnabled(false);
                }
            };
            // Create position transformer
            Transformer.prototype._createPositionTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateCylinder("PositionTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
                mesh.scaling = this._sharedScale;
                mesh.isPickable = true;
                var mesh2 = BABYLON.Mesh.CreateCylinder("PositionTransformerCross" + id, 2, 0, 3, 8, 1, this._scene, true);
                mesh2.isPickable = true;
                mesh2.parent = mesh;
                mesh2.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
                mesh2.position.y = 5;
                var material = new BABYLON.StandardMaterial("PositionTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                mesh2.material = material;
                return mesh;
            };
            // Create rotation transformer
            Transformer.prototype._createRotationTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateTorus("RotationTransformer" + id, 20, 0.75, 35, this._scene, true);
                mesh.scaling = this._sharedScale;
                var material = new BABYLON.StandardMaterial("RotationTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                return mesh;
            };
            // Create scale transformer
            Transformer.prototype._createScalingTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateCylinder("ScalingTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
                mesh.scaling = this._sharedScale;
                mesh.isPickable = true;
                var mesh2 = BABYLON.Mesh.CreateBox("ScalingTransformerBox" + id, 2, this._scene, true);
                mesh.isPickable = true;
                mesh2.parent = mesh;
                mesh2.position.y = 5;
                var material = new BABYLON.StandardMaterial("ScalingTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                mesh2.material = material;
                return mesh;
            };
            return Transformer;
        })();
        EDITOR.Transformer = Transformer;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
