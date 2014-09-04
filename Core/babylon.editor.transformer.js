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
            core.customUpdates.push(this);
            core.eventReceivers.push(this);
            this._transformerType = BabylonEditorTransformerType.Nothing;

            /// Configure
            /// Transformer 
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

            /// Create transformers
            this._createTransformers();
        }

        Transformer.prototype.update = function () {
            this._scene.activeCamera = this._core.currentScene.activeCamera;

            /// Update transformers scales
            var distance = BABYLON.Vector3.Distance(this._scene.activeCamera.position, this._positionTransformerX.position) * 0.03;
            var transform = new BABYLON.Vector3(distance, distance, distance).divide(new BABYLON.Vector3(3, 3, 3));

            /// Position
            this._positionTransformerX.scaling = transform;
            this._positionTransformerY.scaling = transform;
            this._positionTransformerZ.scaling = transform;

            /// Rotation
            this._rotationTransformerX.scaling = transform;
            this._rotationTransformerY.scaling = transform;
            this._rotationTransformerZ.scaling = transform;

            /// Scaling
            this._scalingTransformerX.scaling = transform;
            this._scalingTransformerY.scaling = transform;
            this._scalingTransformerZ.scaling = transform;

            /// Update transformers
            this._positionTransformerX.position.y = distance * 1.3; /// Position
            this._positionTransformerY.position.z = -distance * 1.3;
            this._positionTransformerZ.position.x = distance * 1.3;

            this._scalingTransformerX.position.y = distance * 1.3; /// Scaling
            this._scalingTransformerY.position.z = -distance * 1.3;
            this._scalingTransformerZ.position.x = distance * 1.3;

            /// Finish
            this._scene.render();
        }

        Transformer.prototype.onEvent = function (event) {

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
            } else if (this._transformerType == BabylonEditorTransformerType.Rotation) {
                this._setTransformersEnabled([this._rotationTransformerX, this._rotationTransformerY, this._rotationTransformerZ], true);
            } else if (this._transformerType == BabylonEditorTransformerType.Scaling) {
                this._setTransformersEnabled([this._scalingTransformerX, this._scalingTransformerY, this._scalingTransformerZ], true);
            } /// else Nothing
        }

        Transformer.prototype.setNodeToTransform = function (node) {
            this._nodeToTransform = node;
    
            /// Position
            this._positionTransformerX.parent = node;
            this._positionTransformerY.parent = node;
            this._positionTransformerZ.parent = node;

            /// Rotation
            this._rotationTransformerX.parent = node;
            this._rotationTransformerY.parent = node;
            this._rotationTransformerZ.parent = node;

            /// Scaling
            this._scalingTransformerX.parent = node;
            this._scalingTransformerY.parent = node;
            this._scalingTransformerZ.parent = node;

            this.setTransformerType(this._transformerType);
        }

        Transformer.prototype._setTransformersEnabled = function (transformers, enabled) {
            for (var i = 0; i < transformers.length; i++) {
                transformers[i].setEnabled(enabled);
            }
        }

        Transformer.prototype._createTransformers = function () {
            /// Position
            this._positionTransformerX = this._createPositionModifier('x', new BABYLON.Color3(0, 1, 0));
            this._positionTransformerY = this._createPositionModifier('y', new BABYLON.Color3(1, 0, 0));
            this._positionTransformerZ = this._createPositionModifier('z', new BABYLON.Color3(0, 0, 1));

            /// Rotation
            this._rotationTransformerX = this._createRotationModifier('x', new BABYLON.Color3(0, 1, 0));
            this._rotationTransformerY = this._createRotationModifier('x', new BABYLON.Color3(1, 0, 0));
            this._rotationTransformerZ = this._createRotationModifier('x', new BABYLON.Color3(0, 0, 1));

            /// Scaling
            this._scalingTransformerX = this._createScaleModifier('x', new BABYLON.Color3(0, 1, 0));
            this._scalingTransformerY = this._createScaleModifier('y', new BABYLON.Color3(1, 0, 0));
            this._scalingTransformerZ = this._createScaleModifier('z', new BABYLON.Color3(0, 0, 1));

            /// Set transforms
            this._positionTransformerY.rotation.x = -(Math.PI / 2.0); /// Position
            this._positionTransformerZ.rotation.z = -(Math.PI / 2.0);

            this._rotationTransformerY.rotation.x = -(Math.PI / 2.0); /// Rotation
            this._rotationTransformerZ.rotation.z = -(Math.PI / 2.0);

            this._scalingTransformerY.rotation.x = -(Math.PI / 2.0); /// Scaling
            this._scalingTransformerZ.rotation.z = -(Math.PI / 2.0);

            /// Finish
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

            var mesh2 = BABYLON.Mesh.CreateCylinder('BabylonEditorTransformer:Position:CylinderCross:' + name, 2, 0, 3, 8, 1, this._scene, true);
            mesh2.parent = mesh;
            mesh2.position.y = mesh.scaling.y * 5;

            var material = new BABYLON.StandardMaterial('BabylonEditorTransformer:PMMaterial' + name, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }

        Transformer.prototype._createScaleModifier = function (name, color) {
            var mesh = BABYLON.Mesh.CreateCylinder('BabylonEditorTransformer:Scale:Cylinder:' + name, 8, 0.2, 0.2, 8, 1, this._scene, true);

            var mesh2 = BABYLON.Mesh.CreateBox('BabylonEditorTransformer:Scale:Box' + name, 2, this._scene, true);
            mesh2.parent = mesh;
            mesh2.position.y = mesh.scaling.y * 5;

            var material = new BABYLON.StandardMaterial('BabylonEditorTransformer:PMMaterial' + name, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }

        Transformer.prototype._createRotationModifier = function (name, color) {
            var mesh = BABYLON.Mesh.CreateTorus('BabylonEditorTransformer:Rotation:Torus' + name, 20, 0.5, 35, this._scene, true);

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