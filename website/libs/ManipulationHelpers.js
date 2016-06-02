///<reference path="../typings/babylon.d.ts"/>
var ManipulationHelpers;
(function (ManipulationHelpers) {
    var Color3 = BABYLON.Color3;
    var StandardMaterial = BABYLON.StandardMaterial;
    var Matrix = BABYLON.Matrix;
    var Mesh = BABYLON.Mesh;
    var Vector3 = BABYLON.Vector3;
    var Quaternion = BABYLON.Quaternion;
    var VertexData = BABYLON.VertexData;
    var LinesMesh = BABYLON.LinesMesh;
    /**
     * This class create the visual geometry to display a manipulation radix in a viewport.
     * It also implements the logic to handler intersection, hover on feature.
     */
    var Radix = (function () {
        /**
         * Create a new Radix instance. The length/radius members are optionals and the default value should suit most cases
         * @param scene the owner Scene
         * @param features the feature the radix must display
         * @param arrowLength the length of a row of an axis, include the rotation cylinder (if any), but always exclude the arrow cone
         * @param coneLength the length of the arrow cone. this is also the length taken for the rotation cylinder (if any)
         * @param coneRadius the radius of the arrow cone
         * @param planeSelectionLength the length of the selection plane
         */
        function Radix(scene, features, arrowLength, coneLength, coneRadius, planeSelectionLength) {
            if (features === void 0) { features = 7 /* ArrowsXYZ */ | 112 /* AllPlanesSelection */ | 1792 /* Rotations */; }
            this._scene = scene;
            this._arrowLength = arrowLength ? arrowLength : 1;
            this._coneLength = coneLength ? coneLength : 0.2;
            this._coneRadius = coneRadius ? coneRadius : 0.1;
            this._planeSelectionLength = planeSelectionLength ? planeSelectionLength : (this._arrowLength / 5.0);
            this._wireSelectionThreshold = 0.05;
            this._light1 = new BABYLON.PointLight("ManipulatorLight", new BABYLON.Vector3(50, 50, 70), this._scene);
            this._light1.id = "***SceneManipulatorLight***";
            this._light2 = new BABYLON.PointLight("ManipulatorLight", new BABYLON.Vector3(-50, -50, -70), this._scene);
            this._light2.id = "***SceneManipulatorLight***";
            this._xArrowColor = new Color3(Radix.pc, Radix.sc / 2, Radix.sc);
            this._yArrowColor = new Color3(Radix.sc, Radix.pc, Radix.sc / 2);
            this._zArrowColor = new Color3(Radix.sc / 2, Radix.sc, Radix.pc);
            this._xyPlaneSelectionColor = new Color3(Radix.pc / 1.1, Radix.pc / 1.3, Radix.sc);
            this._xzPlaneSelectionColor = new Color3(Radix.pc / 1.1, Radix.sc, Radix.pc / 1.3);
            this._yzPlaneSelectionColor = new Color3(Radix.sc, Radix.pc / 1.3, Radix.pc / 1.1);
            var materials = [];
            materials.push({ name: "arrowX", color: this.xArrowColor });
            materials.push({ name: "arrowY", color: this.yArrowColor });
            materials.push({ name: "arrowZ", color: this.zArrowColor });
            materials.push({ name: "planeXY", color: this.xyPlaneSelectionColor });
            materials.push({ name: "planeXZ", color: this.xzPlaneSelectionColor });
            materials.push({ name: "planeYZ", color: this.yzPlaneSelectionColor });
            materials.push({ name: "rotationX", color: this.xArrowColor.clone() });
            materials.push({ name: "rotationY", color: this.yArrowColor.clone() });
            materials.push({ name: "rotationZ", color: this.zArrowColor.clone() });
            this._materials = [];
            for (var _i = 0, materials_1 = materials; _i < materials_1.length; _i++) {
                var matData = materials_1[_i];
                var mtl = new StandardMaterial(matData.name + "RadixMaterial", this._scene);
                mtl.diffuseColor = matData.color;
                this._materials[matData.name] = mtl;
            }
            this._features = features;
            this._rootMesh = new Mesh("radixRoot", this._scene);
            this._rootMesh.renderingGroupId = 1;
            this.constructGraphicalObjects();
        }
        Object.defineProperty(Radix.prototype, "wireSelectionThreshold", {
            /**
             * Set/get the Wire Selection Threshold, set a bigger value to improve tolerance while picking a wire mesh
             */
            get: function () {
                return this._wireSelectionThreshold;
            },
            set: function (value) {
                this._wireSelectionThreshold = value;
                var meshes = this._rootMesh.getChildMeshes(true, function (m) { return m instanceof LinesMesh; });
                for (var _i = 0, meshes_1 = meshes; _i < meshes_1.length; _i++) {
                    var mesh = meshes_1[_i];
                    var lm = mesh;
                    if (lm) {
                        lm.intersectionThreshold = value;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "xArrowColor", {
            /**
             * Get/set the colors of the X Arrow
             */
            get: function () {
                return this._xArrowColor;
            },
            set: function (value) {
                this._xArrowColor = value;
                this.updateMaterial("arrowX", value);
                this.updateMaterial("rotationX", value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "yArrowColor", {
            /**
             * Get/set the colors of the Y Arrow
             */
            get: function () {
                return this._yArrowColor;
            },
            set: function (value) {
                this._yArrowColor = value;
                this.updateMaterial("arrowY", value);
                this.updateMaterial("rotationY", value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "zArrowColor", {
            /**
             * Get/set the colors of the Z Arrow
             */
            get: function () {
                return this._zArrowColor;
            },
            set: function (value) {
                this._zArrowColor = value;
                this.updateMaterial("arrowZ", value);
                this.updateMaterial("rotationZ", value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "xyPlaneSelectionColor", {
            /**
             * Get/set the colors of the XY Plane selection anchor
             */
            get: function () {
                return this._xyPlaneSelectionColor;
            },
            set: function (value) {
                this._xyPlaneSelectionColor = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "xzPlaneSelectionColor", {
            /**
             * Get/set the colors of the XZ Plane selection anchor
             */
            get: function () {
                return this._xzPlaneSelectionColor;
            },
            set: function (value) {
                this._xzPlaneSelectionColor = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "yzPlaneSelectionColor", {
            /**
             * Get/set the colors of the YZ Plane selection anchor
             */
            get: function () {
                return this._yzPlaneSelectionColor;
            },
            set: function (value) {
                this._yzPlaneSelectionColor = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "highlighted", {
            /**
             * Get/set the feature of the Radix that are/must be highlighted
             * @returns {}
             */
            get: function () {
                return this._highlighted;
            },
            set: function (value) {
                this.updateMaterialFromHighlighted(1 /* ArrowX */, value, "arrowX");
                this.updateMaterialFromHighlighted(2 /* ArrowY */, value, "arrowY");
                this.updateMaterialFromHighlighted(4 /* ArrowZ */, value, "arrowZ");
                this.updateMaterialFromHighlighted(16 /* PlaneSelectionXY */, value, "planeXY");
                this.updateMaterialFromHighlighted(32 /* PlaneSelectionXZ */, value, "planeXZ");
                this.updateMaterialFromHighlighted(64 /* PlaneSelectionYZ */, value, "planeYZ");
                this.updateMaterialFromHighlighted(256 /* RotationX */, value, "rotationX");
                this.updateMaterialFromHighlighted(512 /* RotationY */, value, "rotationY");
                this.updateMaterialFromHighlighted(1024 /* RotationZ */, value, "rotationZ");
                this._highlighted = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Radix.prototype, "features", {
            /**
             * Get the Radix Features that were selected upon creation
             */
            get: function () {
                return this._features;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * make an intersection test between a point position in the viwport and the Radix, return the feature that is intersected, if any.
         * only the closer Radix Feature is picked.
         * @param pos the viewport position to create the picking ray from.
         */
        Radix.prototype.intersect = function (pos) {
            var hit = 0 /* None */;
            var closest = Number.MAX_VALUE;
            // Arrows
            if (this.hasFeature(1 /* ArrowX */)) {
                var dist = this.intersectMeshes(pos, "arrowX", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 1 /* ArrowX */;
                }
            }
            if (this.hasFeature(2 /* ArrowY */)) {
                var dist = this.intersectMeshes(pos, "arrowY", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 2 /* ArrowY */;
                }
            }
            if (this.hasFeature(4 /* ArrowZ */)) {
                var dist = this.intersectMeshes(pos, "arrowZ", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 4 /* ArrowZ */;
                }
            }
            // Planes
            if (this.hasFeature(16 /* PlaneSelectionXY */)) {
                var dist = this.intersectMeshes(pos, "planeXY", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 16 /* PlaneSelectionXY */;
                }
            }
            if (this.hasFeature(32 /* PlaneSelectionXZ */)) {
                var dist = this.intersectMeshes(pos, "planeXZ", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 32 /* PlaneSelectionXZ */;
                }
            }
            if (this.hasFeature(64 /* PlaneSelectionYZ */)) {
                var dist = this.intersectMeshes(pos, "planeYZ", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 64 /* PlaneSelectionYZ */;
                }
            }
            // Rotation
            if (this.hasFeature(256 /* RotationX */)) {
                var dist = this.intersectMeshes(pos, "rotationX", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 256 /* RotationX */;
                }
            }
            if (this.hasFeature(512 /* RotationY */)) {
                var dist = this.intersectMeshes(pos, "rotationY", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 512 /* RotationY */;
                }
            }
            if (this.hasFeature(1024 /* RotationZ */)) {
                var dist = this.intersectMeshes(pos, "rotationZ", closest);
                if (dist < closest) {
                    closest = dist;
                    hit = 1024 /* RotationZ */;
                }
            }
            return hit;
        };
        /**
         * Set the world coordinate of where the Axis should be displayed
         * @param position the position
         * @param rotation the rotation quaternion
         * @param scale the scale (should be uniform)
         */
        Radix.prototype.setWorld = function (position, rotation, scale) {
            this._rootMesh.position = position;
            this._rootMesh.rotationQuaternion = rotation;
            this._rootMesh.scaling = scale;
        };
        /**
         * Display the Radix on screen
         */
        Radix.prototype.show = function () {
            this.setVisibleState(this._rootMesh, true);
        };
        /**
         * Hide the Radix from the screen
         */
        Radix.prototype.hide = function () {
            this.setVisibleState(this._rootMesh, false);
        };
        Radix.prototype.setVisibleState = function (mesh, state) {
            var _this = this;
            mesh.isVisible = state;
            mesh.getChildMeshes(true).forEach(function (m) { return _this.setVisibleState(m, state); });
        };
        Radix.prototype.intersectMeshes = function (pos, startName, currentClosest) {
            var meshes = this._rootMesh.getChildMeshes(true, function (m) { return m.name.indexOf(startName) === 0; });
            for (var _i = 0, meshes_2 = meshes; _i < meshes_2.length; _i++) {
                var mesh = meshes_2[_i];
                var ray = this._scene.createPickingRay(pos.x, pos.y, mesh.getWorldMatrix(), this._scene.activeCamera);
                var pi = mesh.intersects(ray, false);
                if (pi.hit && pi.distance < currentClosest) {
                    currentClosest = pi.distance;
                }
            }
            return currentClosest;
        };
        Radix.prototype.constructGraphicalObjects = function () {
            var hp = Math.PI / 2;
            if (this.hasFeature(1 /* ArrowX */)) {
                this.constructArrow(1 /* ArrowX */, "arrowX", Matrix.RotationZ(-hp));
            }
            if (this.hasFeature(2 /* ArrowY */)) {
                this.constructArrow(2 /* ArrowY */, "arrowY", Matrix.Identity());
            }
            if (this.hasFeature(4 /* ArrowZ */)) {
                this.constructArrow(4 /* ArrowZ */, "arrowZ", Matrix.RotationX(hp));
            }
            if (this.hasFeature(16 /* PlaneSelectionXY */)) {
                this.constructPlaneSelection(16 /* PlaneSelectionXY */, "planeXY", Matrix.Identity());
            }
            if (this.hasFeature(32 /* PlaneSelectionXZ */)) {
                this.constructPlaneSelection(32 /* PlaneSelectionXZ */, "planeXZ", Matrix.RotationX(hp));
            }
            if (this.hasFeature(64 /* PlaneSelectionYZ */)) {
                this.constructPlaneSelection(64 /* PlaneSelectionYZ */, "planeYZ", Matrix.RotationY(-hp));
            }
            if (this.hasFeature(256 /* RotationX */)) {
                this.constructRotation(256 /* RotationX */, "rotationX", Matrix.RotationZ(-hp));
            }
            if (this.hasFeature(512 /* RotationY */)) {
                this.constructRotation(512 /* RotationY */, "rotationY", Matrix.Identity());
            }
            if (this.hasFeature(1024 /* RotationZ */)) {
                this.constructRotation(1024 /* RotationZ */, "rotationZ", Matrix.RotationX(hp));
            }
        };
        Radix.prototype.constructArrow = function (feature, name, transform) {
            var mtl = this.getMaterial(name);
            var hasRot;
            switch (feature) {
                case 1 /* ArrowX */:
                    hasRot = this.hasFeature(256 /* RotationX */);
                    break;
                case 2 /* ArrowY */:
                    hasRot = this.hasFeature(512 /* RotationY */);
                    break;
                case 4 /* ArrowZ */:
                    hasRot = this.hasFeature(1024 /* RotationZ */);
                    break;
            }
            var rotation = Quaternion.FromRotationMatrix(transform);
            var points = new Array();
            points.push(0, hasRot ? this._coneLength : 0, 0);
            points.push(0, this._arrowLength - this._coneLength, 0);
            var wireMesh = new LinesMesh(name + "Wire", this._scene);
            wireMesh.rotationQuaternion = rotation;
            wireMesh.parent = this._rootMesh;
            wireMesh.color = mtl.diffuseColor;
            wireMesh.renderingGroupId = 1;
            wireMesh.intersectionThreshold = this.wireSelectionThreshold;
            wireMesh.isPickable = false;
            var vd = new VertexData();
            vd.positions = points;
            vd.indices = [0, 1];
            vd.applyToMesh(wireMesh);
            var arrow = Mesh.CreateCylinder(name + "Cone", this._coneLength, 0, this._coneRadius, 18, 1, this._scene, false);
            arrow.position = Vector3.TransformCoordinates(new Vector3(0, this._arrowLength - (this._coneLength / 2), 0), transform);
            arrow.rotationQuaternion = rotation;
            arrow.material = mtl;
            arrow.parent = this._rootMesh;
            arrow.renderingGroupId = 1;
            arrow.isPickable = false;
            this.addSymbolicMeshToLit(arrow);
        };
        Radix.prototype.constructPlaneSelection = function (feature, name, transform) {
            var mtl = this.getMaterial(name);
            var points = new Array();
            points.push(new Vector3(this._arrowLength - this._planeSelectionLength, this._arrowLength, 0));
            points.push(new Vector3(this._arrowLength, this._arrowLength, 0));
            points.push(new Vector3(this._arrowLength, this._arrowLength - this._planeSelectionLength, 0));
            var wireMesh = Mesh.CreateLines(name + "Plane", points, this._scene);
            wireMesh.parent = this._rootMesh;
            wireMesh.color = mtl.diffuseColor;
            wireMesh.rotationQuaternion = Quaternion.FromRotationMatrix(transform);
            wireMesh.renderingGroupId = 1;
            wireMesh.intersectionThreshold = this.wireSelectionThreshold;
            wireMesh.isPickable = false;
        };
        Radix.prototype.constructRotation = function (feature, name, transform) {
            var mtl = this.getMaterial(name);
            var rotCyl = Mesh.CreateCylinder(name + "Cylinder", this._coneLength, this._coneRadius, this._coneRadius, 18, 1, this._scene, false);
            rotCyl.material = mtl;
            rotCyl.position = Vector3.TransformCoordinates(new Vector3(0, this._coneLength / 2, 0), transform);
            rotCyl.rotationQuaternion = Quaternion.FromRotationMatrix(transform);
            rotCyl.parent = this._rootMesh;
            rotCyl.renderingGroupId = 1;
            rotCyl.isPickable = false;
            this.addSymbolicMeshToLit(rotCyl);
        };
        Radix.prototype.addSymbolicMeshToLit = function (mesh) {
            var _this = this;
            this._light1.includedOnlyMeshes.push(mesh);
            this._light2.includedOnlyMeshes.push(mesh);
            this._scene.lights.map(function (l) { if ((l !== _this._light1) && (l !== _this._light2))
                l.excludedMeshes.push(mesh); });
        };
        Radix.prototype.hasFeature = function (value) {
            return (this._features & value) !== 0;
        };
        Radix.prototype.hasHighlightedFeature = function (value) {
            return (this._highlighted & value) !== 0;
        };
        Radix.prototype.updateMaterial = function (name, color) {
            var mtl = this.getMaterial(name);
            if (mtl) {
                mtl.diffuseColor = color;
            }
        };
        Radix.prototype.updateMaterialFromHighlighted = function (feature, highlighted, name) {
            if (!this.hasFeature(feature)) {
                return;
            }
            if ((this._highlighted & feature) !== (highlighted & feature)) {
                var mtl = this.getMaterial(name);
                if ((highlighted & feature) !== 0) {
                    mtl.diffuseColor.r *= 1.8;
                    mtl.diffuseColor.g *= 1.8;
                    mtl.diffuseColor.b *= 1.8;
                }
                else {
                    mtl.diffuseColor.r /= 1.8;
                    mtl.diffuseColor.g /= 1.8;
                    mtl.diffuseColor.b /= 1.8;
                }
            }
        };
        Radix.prototype.getMaterial = function (name) {
            var mtl = this._materials[name];
            return mtl;
        };
        Radix.pc = 0.6;
        Radix.sc = 0.2;
        return Radix;
    }());
    ManipulationHelpers.Radix = Radix;
})(ManipulationHelpers || (ManipulationHelpers = {}));
///<reference path="../typings/babylon.d.ts"/>
///<reference path="radix.ts"/>
var Vector4 = BABYLON.Vector2;
var ManipulationHelpers;
(function (ManipulationHelpers) {
    var Vector2 = BABYLON.Vector2;
    var Vector3 = BABYLON.Vector3;
    var Matrix = BABYLON.Matrix;
    var Plane = BABYLON.Plane;
    var Node = BABYLON.Node;
    var AbstractMesh = BABYLON.AbstractMesh;
    var Light = BABYLON.Light;
    var Quaternion = BABYLON.Quaternion;
    var PointerEventTypes = BABYLON.PointerEventTypes;
    /**
     * This class is used to manipulated a single node.
     * Right now only node of type AbstractMesh is support.
     * In the future, manipulation on multiple selection could be possible.
     *
     * A manipulation start when left clicking and moving the mouse. It can be cancelled if the right mouse button is clicked before releasing the left one (this feature is only possible if noPreventContextMenu is false).
     * Per default translation is peformed when manipulating the arrow (axis or cone) or the plane anchor. If you press the shift key it will switch to rotation manipulation. The Shift key can be toggle while manipulating, the current manipulation is accept and a new one starts.
     *
     * You can set the rotation/translationStep (in radian) to enable snapping.
     *
     * The current implementation of this class creates a radix with all the features selected.
     */
    var ManipulatorInteractionHelper = (function () {
        function ManipulatorInteractionHelper(scene) {
            var _this = this;
            this.noPreventContextMenu = false;
            this._flags = 0;
            this._rotationFactor = 1;
            this._scene = scene;
            this._radix = new ManipulationHelpers.Radix(scene);
            this._shiftKeyState = false;
            this._scene.onBeforeRenderObservable.add(function (e, s) { return _this.onBeforeRender(e, s); });
            this._scene.onPointerObservable.add(function (e, s) { return _this.onPointer(e, s); }, -1, true);
            window.oncontextmenu = function (ev) {
                if (!_this.noPreventContextMenu) {
                    ev.preventDefault();
                }
            };
        }
        /**
         * Attach a node to manipulate. Right now, only manipulation on a single node is supported, but this api will allow manipulation on a multiple selection in the future.
         * @param node
         */
        ManipulatorInteractionHelper.prototype.attachManipulatedNode = function (node) {
            this._manipulatedNode = node;
            this._radix.show();
        };
        /**
         * Detach the node to manipulate. Right now, only manipulation on a single node is supported, but this api will allow manipulation on a multiple selection in the future.
         */
        ManipulatorInteractionHelper.prototype.detachManipulatedNode = function (node) {
            this._manipulatedNode = null;
            this._radix.hide();
        };
        ManipulatorInteractionHelper.prototype.onBeforeRender = function (scene, state) {
            this.renderManipulator();
        };
        ManipulatorInteractionHelper.prototype.onPointer = function (e, state) {
            if (!this._manipulatedNode) {
                return;
            }
            var rayPos = this.getRayPosition(e.event);
            var shiftKeyState = e.event.shiftKey;
            // Detect Modifier Key changes for shift while manipulating: commit and start a new manipulation
            if (this.hasManFlags(1 /* DragMode */) && shiftKeyState !== this._shiftKeyState) {
                this.beginDrag(rayPos, e.event);
            }
            // Mouse move
            if (e.type === PointerEventTypes.POINTERMOVE) {
                // Right button release while left is down => cancel the manipulation. only processed when the context menu is not showed during manipulation
                if (!this.noPreventContextMenu && e.event.button === 2 && e.event.buttons === 1) {
                    this.setManipulatedNodeWorldMatrix(this._firstTransform);
                    this.setManFlags(8 /* Exiting */);
                }
                else if (this.hasManFlags(1 /* DragMode */) && !this.hasManFlags(8 /* Exiting */)) {
                    state.skipNextObservers = true;
                    if (shiftKeyState || this.hasManipulatedMode(1792 /* Rotations */)) {
                        this.doRot(rayPos);
                    }
                    else {
                        this.doPos(rayPos);
                    }
                }
                else {
                    this._radix.highlighted = this._radix.intersect(rayPos);
                }
            }
            else if (e.type === PointerEventTypes.POINTERDOWN && e.event.button === 0) {
                this._manipulatedMode = this._radix.intersect(rayPos);
                if (this._manipulatedMode !== 0 /* None */) {
                    state.skipNextObservers = true;
                    this.beginDrag(rayPos, e.event);
                    this._scene.activeCamera.detachControl(this._scene.getEngine().getRenderingCanvas());
                    if (this.hasManipulatedMode(1792 /* Rotations */)) {
                        this.doRot(rayPos);
                    }
                    else {
                        this.doPos(rayPos);
                    }
                }
            }
            else if (e.type === PointerEventTypes.POINTERUP) {
                if (this.hasManFlags(1 /* DragMode */)) {
                    state.skipNextObservers = true;
                }
                this._radix.highlighted = this._radix.intersect(rayPos);
                // Left up: end manipulation
                if (e.event.button === 0) {
                    this.endDragMode();
                }
                this._scene.activeCamera.attachControl(this._scene.getEngine().getRenderingCanvas());
            }
        };
        ManipulatorInteractionHelper.prototype.beginDrag = function (rayPos, event) {
            this._firstMousePos = rayPos;
            this._prevMousePos = this._firstMousePos.clone();
            this._shiftKeyState = event.shiftKey;
            var mtx = this.getManipulatedNodeWorldMatrix();
            this._pos = mtx.getTranslation();
            this._right = mtx.getRow(0).toVector3();
            this._up = mtx.getRow(1).toVector3();
            this._view = mtx.getRow(2).toVector3();
            this._oldPos = this._pos.clone();
            this._firstTransform = mtx.clone();
            this._flags |= 2 /* FirstHit */ | 1 /* DragMode */;
        };
        ManipulatorInteractionHelper.prototype.endDragMode = function () {
            this.clearManFlags(1 /* DragMode */ | 8 /* Exiting */);
        };
        ManipulatorInteractionHelper.prototype.doRot = function (rayPos) {
            if (this.hasManFlags(2 /* FirstHit */)) {
                this.clearManFlags(2 /* FirstHit */);
                return;
            }
            var dx = rayPos.x - this._prevMousePos.x;
            var dy = rayPos.y - this._prevMousePos.y;
            var cr = this._scene.getEngine().getRenderingCanvasClientRect();
            var ax = (dx / cr.width) * Math.PI * 2 * this._rotationFactor;
            var ay = (dy / cr.height) * Math.PI * 2 * this._rotationFactor;
            if (this.rotationStep) {
                var rem = ax % this.rotationStep;
                ax -= rem;
                rem = ay % this.rotationStep;
                ay -= rem;
            }
            var mtx = Matrix.Identity();
            if (this.hasManipulatedMode(1 /* ArrowX */ | 256 /* RotationX */)) {
                mtx = Matrix.RotationX(ay);
            }
            else if (this.hasManipulatedMode(2 /* ArrowY */ | 512 /* RotationY */)) {
                mtx = Matrix.RotationY(ay);
            }
            else if (this.hasManipulatedMode(4 /* ArrowZ */ | 1024 /* RotationZ */)) {
                mtx = Matrix.RotationZ(ay);
            }
            else {
                if (this.hasManipulatedMode(/*RadixFeatures.CenterSquare |*/ 16 /* PlaneSelectionXY */ | 32 /* PlaneSelectionXZ */)) {
                    mtx = mtx.multiply(Matrix.RotationX(ay));
                }
                if (this.hasManipulatedMode(16 /* PlaneSelectionXY */ | 64 /* PlaneSelectionYZ */)) {
                    mtx = mtx.multiply(Matrix.RotationY(ax));
                }
                if (this.hasManipulatedMode(32 /* PlaneSelectionXZ */)) {
                    mtx = mtx.multiply(Matrix.RotationZ(ay));
                }
                if (this.hasManipulatedMode(/*RadixFeatures.CenterSquare |*/ 32 /* PlaneSelectionXZ */)) {
                    mtx = mtx.multiply(Matrix.RotationZ(ax));
                }
            }
            var tmtx = mtx.multiply(this._firstTransform);
            this.setManipulatedNodeWorldMatrix(tmtx);
        };
        ManipulatorInteractionHelper.prototype.doPos = function (rayPos) {
            var v = Vector3.Zero();
            var ray = this._scene.createPickingRay(rayPos.x, rayPos.y, Matrix.Identity(), this._scene.activeCamera);
            if (this.hasManipulatedMode(16 /* PlaneSelectionXY */ | 32 /* PlaneSelectionXZ */ | 64 /* PlaneSelectionYZ */)) {
                var pl0;
                var hit;
                if (this.hasManipulatedMode(16 /* PlaneSelectionXY */)) {
                    pl0 = Plane.FromPoints(this._pos, this._pos.add(this._right), this._pos.add(this._up));
                }
                else if (this.hasManipulatedMode(32 /* PlaneSelectionXZ */)) {
                    pl0 = Plane.FromPoints(this._pos, this._pos.add(this._right), this._pos.add(this._view));
                }
                else if (this.hasManipulatedMode(64 /* PlaneSelectionYZ */)) {
                    pl0 = Plane.FromPoints(this._pos, this._pos.add(this._up), this._pos.add(this._view));
                }
                else {
                }
                var clip = 0.06;
                //Check if the plane is too parallel to the ray
                if (Math.abs(Vector3.Dot(pl0.normal, ray.direction)) < clip) {
                    return;
                }
                //Make the intersection
                var distance = ray.intersectsPlane(pl0);
                hit = ManipulatorInteractionHelper.ComputeRayHit(ray, distance);
                //Check if it's the first call
                if (this.hasManFlags(2 /* FirstHit */)) {
                    this._flags &= ~2 /* FirstHit */;
                    this._prevHit = hit;
                    return;
                }
                //Compute the vector
                v = hit.subtract(this._prevHit);
            }
            else if ((this._manipulatedMode & (1 /* ArrowX */ | 2 /* ArrowY */ | 4 /* ArrowZ */)) !== 0) {
                var pl0, pl1;
                var hit;
                var s;
                if (this.hasManFlags(2 /* FirstHit */)) {
                    var res = this.setupIntersectionPlanes(this._manipulatedMode);
                    pl0 = res.p0;
                    pl1 = res.p1;
                    if (Math.abs(Vector3.Dot(pl0.normal, ray.direction)) > Math.abs(Vector3.Dot(pl1.normal, ray.direction))) {
                        var distance = ray.intersectsPlane(pl0);
                        hit = ManipulatorInteractionHelper.ComputeRayHit(ray, distance);
                        var number = ~4 /* Plane2 */;
                        this._flags &= number;
                    }
                    else {
                        var distance = ray.intersectsPlane(pl1);
                        hit = ManipulatorInteractionHelper.ComputeRayHit(ray, distance);
                        this._flags |= 4 /* Plane2 */;
                    }
                    this._flags &= ~2 /* FirstHit */;
                    this._prevHit = hit;
                    return;
                }
                else {
                    var axis;
                    var res = this.setupIntersectionPlane(this._manipulatedMode, this.hasManFlags(4 /* Plane2 */));
                    pl0 = res.plane;
                    axis = res.axis;
                    var distance = ray.intersectsPlane(pl0);
                    hit = ManipulatorInteractionHelper.ComputeRayHit(ray, distance);
                    v = hit.subtract(this._prevHit);
                    s = Vector3.Dot(axis, v);
                    v = axis.multiplyByFloats(s, s, s);
                }
            }
            if (this.translationStep) {
                v.x -= v.x % this.translationStep;
                v.y -= v.y % this.translationStep;
                v.z -= v.z % this.translationStep;
            }
            var mtx = this._firstTransform.clone();
            mtx.setTranslation(mtx.getTranslation().add(v));
            this._pos = mtx.getTranslation();
            this.setManipulatedNodeWorldMatrix(mtx);
        };
        ManipulatorInteractionHelper.prototype.hasManipulatedMode = function (value) {
            return (this._manipulatedMode & value) !== 0;
        };
        ManipulatorInteractionHelper.prototype.hasManFlags = function (value) {
            return (this._flags & value) !== 0;
        };
        ManipulatorInteractionHelper.prototype.clearManFlags = function (values) {
            this._flags &= ~values;
            return this._flags;
        };
        ManipulatorInteractionHelper.prototype.setManFlags = function (values) {
            this._flags |= values;
            return this._flags;
        };
        ManipulatorInteractionHelper.ComputeRayHit = function (ray, distance) {
            return ray.origin.add(ray.direction.multiplyByFloats(distance, distance, distance));
        };
        ManipulatorInteractionHelper.prototype.setManipulatedNodeWorldMatrix = function (mtx) {
            if (!this._manipulatedNode) {
                return;
            }
            if (this._manipulatedNode instanceof Node) {
                var mesh = this._manipulatedNode;
                if (mesh.parent) {
                    mtx = mtx.multiply(mesh.parent.getWorldMatrix().clone().invert());
                }
            }
            var pos = Vector3.Zero();
            var scale = Vector3.Zero();
            var rot = new Quaternion();
            mtx.decompose(scale, rot, pos);
            var object = this._manipulatedNode;
            if (object.position) {
                object.position = pos;
            }
            if (object.rotation) {
                object.rotation = rot.toEulerAngles();
            }
            if (object.direction) {
                object.direction = rot.toEulerAngles();
            }
            if (object.rotationQuaternion) {
                object.rotationQuaternion = rot;
            }
            if (object.scaling) {
                object.scaling = scale;
            }
        };
        ManipulatorInteractionHelper.prototype.getManipulatedNodeWorldMatrix = function () {
            if (!this._manipulatedNode) {
                return null;
            }
            if (this._manipulatedNode instanceof AbstractMesh) {
                return this._manipulatedNode.getWorldMatrix();
            }
            else if (this._manipulatedNode instanceof Light) {
                return this._manipulatedNode.getWorldMatrix();
            }
        };
        ManipulatorInteractionHelper.prototype.setupIntersectionPlane = function (mode, plane2) {
            var res = this.setupIntersectionPlanes(mode);
            var pl = plane2 ? res.p1 : res.p0;
            var axis;
            switch (mode) {
                case 1 /* ArrowX */:
                    axis = this._right;
                    break;
                case 2 /* ArrowY */:
                    axis = this._up;
                    break;
                case 4 /* ArrowZ */:
                    axis = this._view;
                    break;
                default:
                    axis = Vector3.Zero();
                    break;
            }
            return { plane: pl, axis: axis };
        };
        ManipulatorInteractionHelper.prototype.setupIntersectionPlanes = function (mode) {
            var p0, p1;
            switch (mode) {
                case 1 /* ArrowX */:
                    p0 = Plane.FromPoints(this._pos, this._pos.add(this._view), this._pos.add(this._right));
                    p1 = Plane.FromPoints(this._pos, this._pos.add(this._right), this._pos.add(this._up));
                    break;
                case 2 /* ArrowY */:
                    p0 = Plane.FromPoints(this._pos, this._pos.add(this._up), this._pos.add(this._right));
                    p1 = Plane.FromPoints(this._pos, this._pos.add(this._up), this._pos.add(this._view));
                    break;
                case 4 /* ArrowZ */:
                    p0 = Plane.FromPoints(this._pos, this._pos.add(this._view), this._pos.add(this._right));
                    p1 = Plane.FromPoints(this._pos, this._pos.add(this._view), this._pos.add(this._up));
                    break;
            }
            return { p0: p0, p1: p1 };
        };
        ManipulatorInteractionHelper.prototype.getRayPosition = function (event) {
            var canvasRect = this._scene.getEngine().getRenderingCanvasClientRect();
            var x = event.clientX - canvasRect.left;
            var y = event.clientY - canvasRect.top;
            return new Vector2(x, y);
        };
        ManipulatorInteractionHelper.prototype.renderManipulator = function () {
            if (!this._manipulatedNode) {
                return;
            }
            if (this._manipulatedNode instanceof Node) {
                var node = this._manipulatedNode;
                var worldMtx = node.getWorldMatrix();
                var l = Vector3.Distance(this._scene.activeCamera.position, worldMtx.getTranslation());
                var vpWidth = this._scene.getEngine().getRenderWidth();
                var s = this.fromScreenToWorld(vpWidth / 100, l) * 20;
                var scale = Vector3.Zero();
                var position = Vector3.Zero();
                var rotation = Quaternion.Identity();
                var res = Matrix.Scaling(s, s, s).multiply(worldMtx);
                res.decompose(scale, rotation, position);
                this._radix.setWorld(position, rotation, scale);
            }
        };
        ManipulatorInteractionHelper.prototype.fromScreenToWorld = function (l, z) {
            var camera = this._scene.activeCamera;
            var r0 = this._scene.createPickingRay(0, 0, Matrix.Identity(), camera, true);
            var r1 = this._scene.createPickingRay(l, 0, Matrix.Identity(), camera, true);
            var p0 = ManipulatorInteractionHelper.evalPosition(r0, z);
            var p1 = ManipulatorInteractionHelper.evalPosition(r1, z);
            return p1.x - p0.x;
        };
        ManipulatorInteractionHelper.evalPosition = function (ray, u) {
            return ray.origin.add(ray.direction.multiplyByFloats(u, u, u));
        };
        return ManipulatorInteractionHelper;
    }());
    ManipulationHelpers.ManipulatorInteractionHelper = ManipulatorInteractionHelper;
})(ManipulationHelpers || (ManipulationHelpers = {}));
///<reference path="../typings/babylon.d.ts"/>
///<reference path="ManipulatorInteractionHelper.ts"/>
var ManipulationHelpers;
(function (ManipulationHelpers) {
    var PointerEventTypes = BABYLON.PointerEventTypes;
    var AbstractMesh = BABYLON.AbstractMesh;
    /**
     * The purpose of this class is to allow the camera manipulation, single node selection and manipulation.
     * You can use it as an example to create your more complexe/different interaction helper
     */
    var SimpleInteractionHelper = (function () {
        function SimpleInteractionHelper(scene) {
            var _this = this;
            this._actionStack = new Array();
            this._scene = scene;
            this._pointerObserver = this._scene.onPointerObservable.add(function (p, s) { return _this.pointerCallback(p, s); }, -1, true);
        }
        Object.defineProperty(SimpleInteractionHelper.prototype, "currentAction", {
            get: function () {
                if (this._actionStack.length === 0) {
                    return 1 /* Selector */;
                }
                return this._actionStack[this._actionStack.length - 1];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SimpleInteractionHelper.prototype, "manipulator", {
            get: function () {
                if (!this._manipulator) {
                    this._manipulator = new ManipulationHelpers.ManipulatorInteractionHelper(this._scene);
                }
                return this._manipulator;
            },
            enumerable: true,
            configurable: true
        });
        SimpleInteractionHelper.prototype.getScene = function () {
            return this._scene;
        };
        SimpleInteractionHelper.prototype.pointerCallback = function (p, s) {
            this.detectActionChanged(p, s);
            switch (this.currentAction) {
                case 1 /* Selector */:
                    this.doSelectorInteraction(p, s);
                    break;
                case 2 /* Camerator */:
                    if (p.type & (PointerEventTypes.POINTERUP | PointerEventTypes.POINTERWHEEL)) {
                        this._actionStack.pop();
                    }
                    break;
            }
        };
        SimpleInteractionHelper.prototype.doSelectorInteraction = function (p, s) {
            s.skipNextObservers = true;
            // We want left button up.
            if (p.type !== PointerEventTypes.POINTERUP || p.event.button !== 0) {
                return;
            }
            var selectedMesh;
            if (p.pickInfo.hit) {
                selectedMesh = p.pickInfo.pickedMesh;
            }
            // We selected the same mesh? nothing to do
            if (this._pickedNode === selectedMesh) {
                selectedMesh.showBoundingBox = !selectedMesh.showBoundingBox;
                if (selectedMesh.showBoundingBox === false) {
                    this.manipulator.detachManipulatedNode(this._pickedNode);
                    this._pickedNode = null;
                }
                return;
            }
            // Detach the manipulator to the current selected mesh
            if (this._pickedNode) {
                if (this._pickedNode instanceof AbstractMesh) {
                    var mesh = this._pickedNode;
                    mesh.showBoundingBox = false;
                }
                this.manipulator.detachManipulatedNode(this._pickedNode);
                this._pickedNode = null;
            }
            // Nothing selected, our job's done
            if (!selectedMesh) {
                return;
            }
            this._pickedNode = selectedMesh;
            selectedMesh.showBoundingBox = true;
            this.manipulator.attachManipulatedNode(this._pickedNode);
        };
        SimpleInteractionHelper.prototype.detectActionChanged = function (p, s) {
            // Detect switch from selection to camerator
            if (this.currentAction === 1 /* Selector */) {
                if (p.type === PointerEventTypes.POINTERDOWN) {
                    if (!p.pickInfo.hit) {
                        this._actionStack.push(2 /* Camerator */);
                        return;
                    }
                }
                if (p.type === PointerEventTypes.POINTERWHEEL) {
                    this._actionStack.push(2 /* Camerator */);
                    return;
                }
            }
        };
        SimpleInteractionHelper.CameratorSwitchThreshold = 4.0;
        return SimpleInteractionHelper;
    }());
    ManipulationHelpers.SimpleInteractionHelper = SimpleInteractionHelper;
})(ManipulationHelpers || (ManipulationHelpers = {}));
var ManipulationHelpers;
(function (ManipulationHelpers) {
    var SymbolicVisualHelper = (function () {
        function SymbolicVisualHelper() {
        }
        SymbolicVisualHelper.prototype.render = function () {
            if (this.renderLight) {
            }
            if (this.renderManipulator) {
            }
        };
        return SymbolicVisualHelper;
    }());
    ManipulationHelpers.SymbolicVisualHelper = SymbolicVisualHelper;
})(ManipulationHelpers || (ManipulationHelpers = {}));
