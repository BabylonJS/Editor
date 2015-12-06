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
                // Public members
                this.core = null;
                // Private members
                this._scene = null;
                this._node = null;
                this._transformerType = TransformerType.POSITION;
                this._xTransformers = new Array();
                this._yTransformers = new Array();
                this._zTransformers = new Array();
                this._sharedScale = BABYLON.Vector3.Zero();
                //Initialize
                this.core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                // Finish
                this._createTransformers();
            }
            // Event receiver
            Transformer.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        if (event.sceneEvent.data === this._node)
                            this._node = null;
                    }
                }
                return false;
            };
            // On pre update
            Transformer.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this.core.currentScene.activeCamera;
                // Set transformer scale
                var distance = BABYLON.Vector3.Distance(this._scene.activeCamera.position, this._xTransformers[0].position) * 0.03;
                var scale = new BABYLON.Vector3(distance, distance, distance).divide(new BABYLON.Vector3(3, 3, 3));
                this._sharedScale.x = scale.x;
                this._sharedScale.y = scale.y;
                this._sharedScale.z = scale.z;
                // Update transformer (position is particular)
                this._xTransformers[0].position.copyFrom(BABYLON.Vector3.Zero());
                this._yTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._zTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[0].position.y += distance * 1.3;
                this._zTransformers[0].position.z += distance * 1.3;
                this._xTransformers[0].position.x += distance * 1.3;
                this._xTransformers[1].position.copyFrom(BABYLON.Vector3.Zero());
                this._yTransformers[1].position.copyFrom(BABYLON.Vector3.Zero());
                this._zTransformers[1].position.copyFrom(BABYLON.Vector3.Zero());
                this._xTransformers[2].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[2].position.copyFrom(this._yTransformers[0].position);
                this._zTransformers[2].position.copyFrom(this._zTransformers[0].position);
            };
            // On post update
            Transformer.prototype.onPostUpdate = function () {
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
            // Create transformers
            Transformer.prototype._createTransformers = function () {
                var colors = [
                    new BABYLON.Color3(0, 0, 1),
                    new BABYLON.Color3(1, 0, 0),
                    new BABYLON.Color3(0, 1, 0)
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
//# sourceMappingURL=babylon.editor.transformer.js.map