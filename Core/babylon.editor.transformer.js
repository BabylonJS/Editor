/// <reference path="./../index.html" />

/* 

Transformer class. It contains a custom scene
with arrows etc. to place, rotate or scale objects.

*/

/// Transformer types. Work has statics ?
var BabylonEditorTransformerType = BabylonEditorTransformerType || {};
BabylonEditorTransformerType.Position = 0;
BabylonEditorTransformerType.Rotation = 1;
BabylonEditorTransformerType.Scaling = 2;
BabylonEditorTransformerType.Nothing = 3;

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

    var Transformer = (function () { 

        function Transformer(engine, core) {
            /// "This"
            this._engine = engine;
            this._core = core;
            core.eventReceivers.push(this);
            this._transformerType = BabylonEditorTransformerType.Nothing;

            /// Configure
            /// Scene 
            this._scene = new BABYLON.Scene(engine);
            this._scene.autoClear = false;

            /// Node to transform ref
            this._nodeToTransform = null;

            /// Meshes
            this._positionTransformerX = null;
            this._positionTransformerY = null;
            this._positionTransformerZ = null;

            this._scalingTransformerX = null;
            this._scalingTransformerY = null;
            this._scalingTransformerZ = null;

            this._rotationTransformerX = null;
            this._rotationTransformerY = null;
            this._rotationTransformerZ = null;

            this._xmeshes = new Array();
            this._ymeshes = new Array();
            this._zmeshes = new Array();

            /// Values
            this._transform = new BABYLON.Vector3(0, 0, 0);
            this._mousePositionInPlane = new BABYLON.Vector3(0, 0, 0);
            this._mousePosition = new BABYLON.Vector3(0, 0, 0);
            this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(
                new BABYLON.Vector3.Zero(),
                new BABYLON.Vector3(0, 1, 0)
            );

            this._mouseDown = false;
            this._pickPosition = true;

            this._selectedTransformer = null;
            this._pickedInfos = null;
            this._selectedTransform = null;

            /// Create transformers
            this._createTransformers();

            /// Events
            var scope = this;
            this._core.canvas.onmousedown = function (event) {
                scope._mouseDown = true;
            };
            this._core.canvas.onmouseup = function (event) {
                scope._mouseDown = false;
                scope._pickPosition = true;
                scope._core.currentScene.activeCamera.attachControl(scope._core.canvas, false);
                if (scope._pickedInfos != null)
                    scope._restorTransformerColor();
                scope._pickedInfos = null;
                if (scope._nodeToTransform != null)
                    BABYLON.Editor.Utils.sendEventObjectChanged(scope._nodeToTransform, scope._core);
            };
        }

        Transformer.prototype.update = function () {
            if (!this._core.engine.isFullscreen) {
                this._scene.activeCamera = this._core.currentScene.activeCamera;

                if (this._nodeToTransform != null) {
                    if (this._nodeToTransform instanceof BABYLON.AbstractMesh) {
                        this._nodeToTransform.computeWorldMatrix(true);
                        this._positionTransformerX.position = this._nodeToTransform.position.clone();
                    } else {
                        this._positionTransformerX.position = this._nodeToTransform.position.clone();
                    }

                    /// Update transformers scales
                    var distance = BABYLON.Vector3.Distance(this._scene.activeCamera.position, this._positionTransformerX.position) * 0.03;
                    var transform = new BABYLON.Vector3(distance, distance, distance).divide(new BABYLON.Vector3(3, 3, 3));
                    this._transform.x = transform.x;
                    this._transform.y = transform.y;
                    this._transform.z = transform.z;

                    /// Update transformers
                    /// Position
                    this._positionTransformerY.position = this._positionTransformerX.position.clone();
                    this._positionTransformerZ.position = this._positionTransformerX.position.clone();
                    this._positionTransformerY.position.y += distance * 1.3;
                    this._positionTransformerZ.position.z += distance * 1.3;
                    this._positionTransformerX.position.x += distance * 1.3;

                    /// Rotation
                    this._rotationTransformerX.position = this._nodeToTransform.position;
                    this._rotationTransformerY.position = this._nodeToTransform.position;
                    this._rotationTransformerZ.position = this._nodeToTransform.position;

                    /// Scaling
                    this._scalingTransformerX.position = this._positionTransformerX.position.clone();
                    this._scalingTransformerY.position = this._positionTransformerY.position.clone();
                    this._scalingTransformerZ.position = this._positionTransformerZ.position.clone();

                    if (this._mouseDown)
                        this._updateTransform(distance);
                    else
                        this._highlightTransformer();

                    /// Finish
                    this._scene.render();
                }
            }
        }

        /// Receive events
        Transformer.prototype.onEvent = function (event) {

        }

        /// Returns if the line intersects the plane and updates this._mousePositionInPlane
        Transformer.prototype._getIntersectionWithLine = function (linePoint, lineVect) {

            var t2 = BABYLON.Vector3.Dot(this._pickingPlane.normal.clone(), lineVect.clone());
            if (t2 == 0)
                return false;

            var t = -(BABYLON.Vector3.Dot(this._pickingPlane.normal.clone(), linePoint.clone()) + this._pickingPlane.d) / t2;
            var result = linePoint.clone().add(lineVect.clone().multiply(new BABYLON.Vector3(t, t, t)));
            this._mousePositionInPlane = result;
            return true;
        }

        Transformer.prototype._findMousePositionInPlane = function (pickingInfos) {
            var ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, BABYLON.Matrix.Identity());

            if (this._getIntersectionWithLine(
                ray.origin.clone(),
                pickingInfos.pickedPoint.clone().subtract(ray.origin.clone().multiply(ray.direction))))
            {
                return true;
            } else {
                return false;
            }
        }

        /// Highlight the selected transformer, to know if a transformer is picked and ready to act
        Transformer.prototype._highlightTransformer = function () {
            if (this._pickedInfos != null)
                return;

            /// Get the picked mesh in this._scene;
            var pickedMesh = this._core.getPickedMesh({
                layerX: this._scene.pointerX,
                layerY: this._scene.pointerY
            }, false, this._scene);

            /// highlight or restor color
            if (pickedMesh.hit) {
                if (pickedMesh.pickedMesh != this._selectedTransformer) {
                    var currentColor = pickedMesh.pickedMesh.material.emissiveColor;
                    if (currentColor.r == 1 || currentColor.g == 1 || currentColor.b == 1) {
                        pickedMesh.pickedMesh.material.emissiveColor = currentColor.multiply(new BABYLON.Color3(0.5, 0.5, 0.5));
                    }
                }
                this._selectedTransformer = pickedMesh.pickedMesh;
            } else {
                if (this._selectedTransformer != null) {
                    this._selectedTransformer.material.emissiveColor
                        = this._selectedTransformer.material.emissiveColor.multiply(new BABYLON.Color3(2, 2, 2));
                    this._selectedTransformer = null;
                }
            }
        }

        /// Restor the selected transformer's color
        Transformer.prototype._restorTransformerColor = function () {
            this._pickedInfos.pickedMesh.material.emissiveColor
                        = this._pickedInfos.pickedMesh.material.emissiveColor.multiply(new BABYLON.Color3(2, 2, 2));
        }

        /// If the mouse is down and object is selected, compute the nodeToTransform's transform
        Transformer.prototype._updateTransform = function (distance) {

            if (this._pickedInfos == null) {
                /// Get the picked mesh in this._scene;
                var pickedMesh = null;
                if (this._pickedInfos == null) {
                    pickedMesh = this._core.getPickedMesh({
                        layerX: this._scene.pointerX,
                        layerY: this._scene.pointerY
                    }, false, this._scene);
                }

                /// The is only transformers in the scene.
                if (!pickedMesh.hit && this._pickedInfos == null)
                    return;

                if (pickedMesh.hit && this._pickedInfos == null) {
                    this._pickedInfos = pickedMesh;
                }
            }

            if (this._pickPosition) {
                /// Setup plane and set selected transformer type (x, y, or z)
                if (this._xmeshes.indexOf(this._pickedInfos.pickedMesh) > -1) {
                    this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(this._nodeToTransform.position.clone(), new BABYLON.Vector3(0, -1, 0));
                    this._selectedTransform = 'x';
                } else if (this._ymeshes.indexOf(this._pickedInfos.pickedMesh) > -1) {
                    this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(this._nodeToTransform.position.clone(), new BABYLON.Vector3(-1, 0, 0));
                    this._selectedTransform = 'y'
                } else if (this._zmeshes.indexOf(this._pickedInfos.pickedMesh) > -1) {
                    this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(this._nodeToTransform.position.clone(), new BABYLON.Vector3(0, 1, 0));
                    this._selectedTransform = 'z';
                }

                if (this._findMousePositionInPlane(this._pickedInfos)) {
                    this._mousePosition = this._mousePositionInPlane.clone();

                    if (this._transformerType == BabylonEditorTransformerType.Position) {
                        this._mousePosition = this._mousePosition.subtract(this._nodeToTransform.position);
                    } else if (this._transformerType == BabylonEditorTransformerType.Scaling) {
                        this._mousePosition = this._mousePosition.subtract(this._nodeToTransform.scaling);
                    } else if (this._transformerType == BabylonEditorTransformerType.Rotation) {
                        if (this._nodeToTransform.rotation)
                            this._mousePosition = this._mousePosition.subtract(this._nodeToTransform.rotation);
                        else if (this._nodeToTransform.direction)
                            this._mousePosition = this._mousePosition.subtract(this._nodeToTransform.direction);
                    }
                    /// change color of the selected transformer
                    this._pickedInfos.pickedMesh.material.emissiveColor
                        = this._pickedInfos.pickedMesh.material.emissiveColor.multiply(new BABYLON.Color3(0.5, 0.5, 0.5));
                    /// Do not need to re-update
                    this._pickPosition = false;
                }

                /// Detach controls because a transformer was selected
                this._core.currentScene.activeCamera.detachControl(this._core.canvas);
            }

            /// Update position
            if (this._transformerType == BabylonEditorTransformerType.Position) {
                if (this._findMousePositionInPlane(this._pickedInfos)) {
                    if (this._selectedTransform == 'x')
                        this._nodeToTransform.position.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                    else if (this._selectedTransform == 'y')
                        this._nodeToTransform.position.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                    else if (this._selectedTransform == 'z')
                        this._nodeToTransform.position.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                }
            /// Update scaling
            } else if (this._transformerType == BabylonEditorTransformerType.Scaling) {
                if (this._findMousePositionInPlane(this._pickedInfos)) {
                    if (this._selectedTransform == 'x')
                        this._nodeToTransform.scaling.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                    else if (this._selectedTransform == 'y')
                        this._nodeToTransform.scaling.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                    else if (this._selectedTransform == 'z')
                        this._nodeToTransform.scaling.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                }
            /// Update rotation
            } else if (this._transformerType == BabylonEditorTransformerType.Rotation) {
                if (this._findMousePositionInPlane(this._pickedInfos)) {
                    if (this._selectedTransform == 'x') {
                        if (this._nodeToTransform.rotation)
                            this._nodeToTransform.rotation.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                        else if (this._nodeToTransform.direction)
                            this._nodeToTransform.direction.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                    } else if (this._selectedTransform == 'y') {
                        if (this._nodeToTransform.rotation)
                            this._nodeToTransform.rotation.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                        else if (this._nodeToTransform.direction)
                            this._nodeToTransform.direction.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                    } else if (this._selectedTransform == 'z') {
                        if (this._nodeToTransform.rotation)
                            this._nodeToTransform.rotation.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                        else if (this._nodeToTransform.direction)
                            this._nodeToTransform.direction.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                    }
                }
            }

        }

        Transformer.prototype.setTransformerType = function (type) {
            this._transformerType = type;

            this._setTransformersEnabled([this._positionTransformerX, this._positionTransformerY, this._positionTransformerZ], false);
            this._setTransformersEnabled([this._rotationTransformerX, this._rotationTransformerY, this._rotationTransformerZ], false);
            this._setTransformersEnabled([this._scalingTransformerX, this._scalingTransformerY, this._scalingTransformerZ], false);

            if (this._nodeToTransform == null)
                return;

            if (this._transformerType == BabylonEditorTransformerType.Position) {
                this._setTransformersEnabled([this._positionTransformerX, this._positionTransformerY, this._positionTransformerZ], true);
            } else if (this._transformerType == BabylonEditorTransformerType.Rotation
                       && (this._nodeToTransform.rotation || this._nodeToTransform.direction))
            {
                this._setTransformersEnabled([this._rotationTransformerX, this._rotationTransformerY, this._rotationTransformerZ], true);
            } else if (this._transformerType == BabylonEditorTransformerType.Scaling && this._nodeToTransform instanceof BABYLON.AbstractMesh) {
                this._setTransformersEnabled([this._scalingTransformerX, this._scalingTransformerY, this._scalingTransformerZ], true);
            } /// else Nothing
        }

        Transformer.prototype.setNodeToTransform = function (node) {
            this._nodeToTransform = node;

            this.setTransformerType(this._transformerType);
        }

        Transformer.prototype._setTransformersEnabled = function (transformers, enabled) {
            for (var i = 0; i < transformers.length; i++) {
                transformers[i].setEnabled(enabled);
            }
        }

        Transformer.prototype._createTransformers = function () {
            /// Position
            this._positionTransformerZ = this._createPositionModifier('x', new BABYLON.Color3(0, 0, 1));
            this._positionTransformerX = this._createPositionModifier('y', new BABYLON.Color3(1, 0, 0));
            this._positionTransformerY = this._createPositionModifier('z', new BABYLON.Color3(0, 1, 0));

            /// Rotation
            this._rotationTransformerZ = this._createRotationModifier('x', new BABYLON.Color3(0, 0, 1));
            this._rotationTransformerX = this._createRotationModifier('x', new BABYLON.Color3(1, 0, 0));
            this._rotationTransformerY = this._createRotationModifier('x', new BABYLON.Color3(0, 1, 0));

            /// Scaling
            this._scalingTransformerZ = this._createScaleModifier('x', new BABYLON.Color3(0, 0, 1));
            this._scalingTransformerX = this._createScaleModifier('y', new BABYLON.Color3(1, 0, 0));
            this._scalingTransformerY = this._createScaleModifier('z', new BABYLON.Color3(0, 1, 0));

            /// Set transforms
            this._positionTransformerZ.rotation.x = (Math.PI / 2.0); /// Position
            this._positionTransformerX.rotation.z = -(Math.PI / 2.0);

            this._rotationTransformerZ.rotation.x = (Math.PI / 2.0); /// Rotation
            this._rotationTransformerX.rotation.z = -(Math.PI / 2.0);

            this._scalingTransformerZ.rotation.x = (Math.PI / 2.0); /// Scaling
            this._scalingTransformerX.rotation.z = -(Math.PI / 2.0);

            /// Share the scaling vector
            this._positionTransformerX.scaling = this._transform; /// Position
            this._positionTransformerY.scaling = this._transform;
            this._positionTransformerZ.scaling = this._transform;

            this._rotationTransformerX.scaling = this._transform; /// Rotation
            this._rotationTransformerY.scaling = this._transform;
            this._rotationTransformerZ.scaling = this._transform;

            this._scalingTransformerX.scaling = this._transform; /// Scaling
            this._scalingTransformerY.scaling = this._transform;
            this._scalingTransformerZ.scaling = this._transform;

            /// Finish
            this._xmeshes.push.apply(this._xmeshes, [
                this._positionTransformerX, this._positionTransformerX.getDescendants()[0],
                this._rotationTransformerX,
                this._scalingTransformerX, this._scalingTransformerX.getDescendants()[0]
            ]);
            this._ymeshes.push.apply(this._ymeshes, [
                this._positionTransformerY, this._positionTransformerY.getDescendants()[0],
                this._rotationTransformerY,
                this._scalingTransformerY, this._scalingTransformerY.getDescendants()[0]
            ]);
            this._zmeshes.push.apply(this._zmeshes, [
                this._positionTransformerZ, this._positionTransformerZ.getDescendants()[0],
                this._rotationTransformerZ,
                this._scalingTransformerZ, this._scalingTransformerZ.getDescendants()[0]
            ]);

            this._positionTransformerX.setEnabled(false); /// Position
            this._positionTransformerY.setEnabled(false);
            this._positionTransformerZ.setEnabled(false);

            this._rotationTransformerX.setEnabled(false); /// Rotation
            this._rotationTransformerY.setEnabled(false);
            this._rotationTransformerZ.setEnabled(false);

            this._scalingTransformerX.setEnabled(false); /// Scaling
            this._scalingTransformerY.setEnabled(false);
            this._scalingTransformerZ.setEnabled(false);
        }

        Transformer.prototype._createPositionModifier = function (name, color) {
            var mesh = BABYLON.Mesh.CreateCylinder('BabylonEditorTransformer:Position:Cylinder:' + name, 8, 0.2, 0.2, 8, 1, this._scene, true);
            mesh.isPickable = true;

            var mesh2 = BABYLON.Mesh.CreateCylinder('BabylonEditorTransformer:Position:CylinderCross:' + name, 2, 0, 3, 8, 1, this._scene, true);
            this.isPickable = true;
            mesh2.parent = mesh;
            mesh2.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
            mesh2.position.y = mesh.scaling.y * 5;

            var material = new BABYLON.StandardMaterial('BabylonEditorTransformer:PMMaterial' + name, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }

        Transformer.prototype._createScaleModifier = function (name, color) {
            var mesh = BABYLON.Mesh.CreateCylinder('BabylonEditorTransformer:Scale:Cylinder:' + name, 8, 0.2, 0.2, 8, 1, this._scene, true);
            mesh.isPickable = true;

            var mesh2 = BABYLON.Mesh.CreateBox('BabylonEditorTransformer:Scale:Box' + name, 2, this._scene, true);
            mesh.isPickable = true;
            mesh2.parent = mesh;
            mesh2.position.y = mesh.scaling.y * 5;

            var material = new BABYLON.StandardMaterial('BabylonEditorTransformer:PMMaterial' + name, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }

        Transformer.prototype._createRotationModifier = function (name, color) {
            var mesh = BABYLON.Mesh.CreateTorus('BabylonEditorTransformer:Rotation:Torus' + name, 20, 0.75, 35, this._scene, true);

            var material = new BABYLON.StandardMaterial('BabylonEditorTransformer:PMMaterial' + name, this._scene);
            material.emissiveColor = color;
            mesh.material = material;

            return mesh;
        }

        return Transformer;

    })();

BABYLON.Editor.Transformer = Transformer;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON
