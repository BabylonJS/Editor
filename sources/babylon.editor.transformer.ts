module BABYLON.EDITOR {
    export enum TransformerType {
        POSITION = 0,
        ROTATION = 1,
        SCALING = 2,
        NOTHING = 3
    }

    export class Transformer implements IEventReceiver, ICustomUpdate {
        // Public members
        public core: EditorCore = null;

        // Private members
        private _scene: Scene = null;
        private _node: any = null;

        private _helperPlane: Mesh = null;
        private _planeMaterial: StandardMaterial = null;
        private _subMesh: SubMesh = null;
        private _batch: _InstancesBatch = null;
        private _cameraTexture: Texture = null;
        private _soundTexture: Texture = null;
        private _lightTexture: Texture = null;

        private _transformerType: TransformerType = TransformerType.POSITION;
        private _xTransformers: AbstractMesh[] = new Array<AbstractMesh>();
        private _yTransformers: AbstractMesh[] = new Array<AbstractMesh>();
        private _zTransformers: AbstractMesh[] = new Array<AbstractMesh>();

        private _sharedScale: Vector3 = Vector3.Zero();

        private _pickingPlane: Plane = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());
        private _mousePositionInPlane: Vector3;
        private _mousePosition: Vector3 = Vector3.Zero();
        private _mouseDown: boolean = false;
        private _pickPosition: boolean = true;
        private _pickingInfo: PickingInfo = null;
        private _vectorToModify: Vector3 = null;
        private _selectedTransform: string = "";
        private _distance: number = 0;
        private _multiplier: number = 20;
        private _ctrlIsDown: boolean = false;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            //Initialize
            this.core = core;
            core.eventReceivers.push(this);
            core.updates.push(this);

            // Create scene
            this._scene = new Scene(core.engine);
            this._scene.autoClear = false;
            this._scene.postProcessesEnabled = false;

            // Create events
            core.canvas.addEventListener("mousedown", (ev: UIEvent) => {
                this._mouseDown = true;
            });

            core.canvas.addEventListener("mouseup", (ev: UIEvent) => {
                this._mouseDown = false;
                this._pickPosition = true;

                if (this._pickingInfo) {
                    var material: StandardMaterial = <StandardMaterial>this._pickingInfo.pickedMesh.material;
                    material.emissiveColor = material.emissiveColor.multiply(new Color3(1.5, 1.5, 1.5));
                }

                this._pickingInfo = null;
                core.currentScene.activeCamera.attachControl(core.canvas);

                if (this._node)
                    Event.sendSceneEvent(this._node, SceneEventType.OBJECT_CHANGED, core);
            });

            $(window).keydown((event: KeyboardEvent) => {
                if (event.ctrlKey && this._ctrlIsDown === false) {
                    this._multiplier = 1;
                    this._ctrlIsDown = true;
                    this._pickPosition = true;
                }
            });

            $(window).keyup((event: KeyboardEvent) => {
                if (!event.ctrlKey && this._ctrlIsDown === true) {
                    this._multiplier = 10;
                    this._ctrlIsDown = false;
                    this._pickPosition = true;
                }
            });

            // Create Transformers
            this._createTransformers();

            // Helper
            this.createHelpers(core);
        }

        // Create helpers
        public createHelpers(core: EditorCore): void {
            this._planeMaterial = new StandardMaterial("HelperPlaneMaterial", this._scene);
            this._planeMaterial.emissiveColor = Color3.White();
            this._planeMaterial.useAlphaFromDiffuseTexture = true;
            this._planeMaterial.disableDepthWrite = false;
            this._scene.materials.pop();

            this._cameraTexture = new Texture("../css/images/camera.png", this._scene);
            this._cameraTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._soundTexture = new Texture("../css/images/sound.png", this._scene);
            this._soundTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._lightTexture = new Texture("../css/images/light.png", this._scene);
            this._lightTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._helperPlane = Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
            this._helperPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
            this._scene.meshes.pop();
            this._helperPlane.material = this._planeMaterial;
        }

        // Event receiver
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_REMOVED) {
                    if (event.sceneEvent.data === this._node) {
                        this._node = null;
                        return false;
                    }
                }
                else if (event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                    if (event.sceneEvent.object)
                        this._node = event.sceneEvent.object;
                    else
                        this._node = null;
                    return false;
                }
            }

            return false;
        }

        // On pre update
        public onPreUpdate(): void {
            // Update camera
            this._scene.activeCamera = this.core.currentScene.activeCamera;

            // Compute node
            var node: any = this._node;

            if (!node)
                return;

            // Set transformer scale
            var distance = 0;

            if (!this.core.isPlaying) {
                distance = Vector3.Distance(this._scene.activeCamera.position, this._xTransformers[0].position) * 0.03;
            }

            var scale = new Vector3(distance, distance, distance).divide(new Vector3(3, 3, 3));
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
        }

        // On post update
        public onPostUpdate(): void {
            //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);

            if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                return;

            var engine = this._scene.getEngine();
            engine.setAlphaTesting(true);

            if (this._planeMaterial.isReady(this._helperPlane)) {
                this._subMesh = this._helperPlane.subMeshes[0];
                var effect = this._planeMaterial.getEffect();
                this._batch = this._helperPlane._getInstancesRenderList(this._subMesh._id);

                engine.enableEffect(effect);
                this._helperPlane._bind(this._subMesh, effect, Material.TriangleFillMode);

                // Cameras
                this._planeMaterial.diffuseTexture = this._cameraTexture;
                this._renderHelperPlane(this.core.currentScene.cameras, (obj: Camera) => {
                    if (obj === this.core.currentScene.activeCamera)
                        return false;

                    this._helperPlane.position.copyFrom(obj.position);
                    return true;
                });

                // Sounds
                this._planeMaterial.diffuseTexture = this._soundTexture;
                for (var i = 0; i < this.core.currentScene.soundTracks.length; i++) {
                    var soundTrack = this.core.currentScene.soundTracks[i];
                    this._renderHelperPlane(soundTrack.soundCollection, (obj: Sound) => {
                        if (!obj.spatialSound)
                            return false;

                        this._helperPlane.position.copyFrom((<any>obj)._position);
                        return true;
                    });
                }

                // Lights
                this._planeMaterial.diffuseTexture = this._lightTexture;
                this._renderHelperPlane(this.core.currentScene.lights, (obj: Light) => {
                    if (!obj.getAbsolutePosition)
                        return false;

                    this._helperPlane.position.copyFrom(obj.getAbsolutePosition());
                    return true;
                });
            }
        }

        // Get transformer type (POSITION, ROTATION or SCALING)
        public get transformerType() {
            return this._transformerType;
        }

        // Set transformer type
        public set transformerType(type: TransformerType) {
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
        }

        // Get the node to transform
        public get node() {
            return this._node;
        }

        // Set node to transform
        public set node(node: Node) {
            this._node = node;
        }

        // Returns the scene
        public getScene(): Scene {
            return this._scene;
        }

        // Returns the node position
        private _getNodePosition(): Vector3 {
            var node: any = this._node;
            var position: Vector3 = null;

            /*
            if (node.getBoundingInfo && node.geometry) {
                position = node.getBoundingInfo().boundingSphere.centerWorld;
            }
            else */if (node._position) {
                position = node._position;
            }
            else if (node.position) {
                position = node.position;
            }

            return position;
        }

        // Render planes
        private _renderHelperPlane(array: any[], onConfigure: (obj: any) => boolean): void {
            var effect = this._planeMaterial.getEffect();

            for (var i = 0; i < array.length; i++) {
                var obj = array[i];

                if (!onConfigure(obj))
                    continue;

                var distance = Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                this._helperPlane.scaling = new Vector3(distance, distance, distance), 
                this._helperPlane.computeWorldMatrix(true);

                this._scene._cachedMaterial = null;
                this._planeMaterial.bind(this._helperPlane.getWorldMatrix(), this._helperPlane);

                this._helperPlane._processRendering(this._subMesh, effect, Material.TriangleFillMode, this._batch, false, (isInstance, world) => {
                    effect.setMatrix("world", world);
                });
            }
        }

        // Updates the transformer (picking + manage movements)
        private _updateTransform(distance: number): void {
            if (this._pickingInfo === null) {
                // Pick
                var pickInfo = this._scene.pick(this._scene.pointerX, this._scene.pointerY);

                if (!pickInfo.hit && this._pickingInfo === null)
                    return;

                if (pickInfo.hit && this._pickingInfo === null)
                    this._pickingInfo = pickInfo;
            }

            var mesh = <AbstractMesh>this._pickingInfo.pickedMesh.parent || this._pickingInfo.pickedMesh;
            var node: any = this._node;
            var position = this._getNodePosition();

            if (this._pickPosition) {
                // Setup planes
                if (this._xTransformers.indexOf(mesh) !== -1) {
                    this._pickingPlane = Plane.FromPositionAndNormal(position, new Vector3(0, 0, -1));
                    this._selectedTransform = "x";
                }
                else if (this._yTransformers.indexOf(mesh) !== -1) {
                    this._pickingPlane = Plane.FromPositionAndNormal(position, new Vector3(-1, 0, 0));
                    this._selectedTransform = "y";
                }
                else if (this._zTransformers.indexOf(mesh) !== -1) {
                    this._pickingPlane = Plane.FromPositionAndNormal(position, new Vector3(0, -1, 0));
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
                    (<StandardMaterial>mesh.material).emissiveColor = (<StandardMaterial>mesh.material).emissiveColor.multiply(new Color3(0.5, 0.5, 0.5));

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

                if (this._node instanceof Sound) {
                    (<any>this._node).setPosition(this._vectorToModify);
                }
            }
        }

        // Returns if the ray intersects the transformer plane
        private _getIntersectionWithLine(linePoint: Vector3, lineVect: Vector3): boolean {
            var t2 = Vector3.Dot(this._pickingPlane.normal, lineVect);
            if (t2 === 0)
                return false;

            var t = -(Vector3.Dot(this._pickingPlane.normal, linePoint) + this._pickingPlane.d) / t2;
            this._mousePositionInPlane = linePoint.add(lineVect).multiplyByFloats(this._multiplier, this._multiplier, this._multiplier);
            return true;
        }

        // Fins the mouse position in plane
        private _findMousePositionInPlane(pickingInfos: PickingInfo): boolean {
            var ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, Matrix.Identity(), this._scene.activeCamera);
            
            if (this._getIntersectionWithLine(ray.origin, ray.direction))
                return true;

            return false;
        }

        // Create transformers
        private _createTransformers(): void {
            var colors = [
                new Color3(1, 0, 0),
                new Color3(0, 1, 0),
                new Color3(0, 0, 1)
            ];

            var x: Mesh = null;
            var y: Mesh = null;
            var z: Mesh = null;

            // Position
            x = this._createPositionTransformer(colors[0], TransformerType.POSITION);
            y = this._createPositionTransformer(colors[1], TransformerType.POSITION);
            z = this._createPositionTransformer(colors[2], TransformerType.POSITION);

            z.rotation.x = (Math.PI / 2.0);
            x.rotation.z = - (Math.PI / 2.0);

            this._xTransformers.push(x);
            this._yTransformers.push(y);
            this._zTransformers.push(z);

            // Rotation
            x = this._createRotationTransformer(colors[0], TransformerType.ROTATION);
            y = this._createRotationTransformer(colors[1], TransformerType.ROTATION);
            z = this._createRotationTransformer(colors[2], TransformerType.ROTATION);

            z.rotation.x = (Math.PI / 2.0);
            x.rotation.z = - (Math.PI / 2.0);

            this._xTransformers.push(x);
            this._yTransformers.push(y);
            this._zTransformers.push(z);

            // Scaling
            x = this._createScalingTransformer(colors[0], TransformerType.SCALING);
            y = this._createScalingTransformer(colors[1], TransformerType.SCALING);
            z = this._createScalingTransformer(colors[2], TransformerType.SCALING);

            z.rotation.x = (Math.PI / 2.0);
            x.rotation.z = - (Math.PI / 2.0);

            this._xTransformers.push(x);
            this._yTransformers.push(y);
            this._zTransformers.push(z);

            // Finish
            for (var i = 0; i < TransformerType.NOTHING; i++) {
                this._xTransformers[i].setEnabled(false);
                this._yTransformers[i].setEnabled(false);
                this._zTransformers[i].setEnabled(false);
            }
        }

        // Create position transformer
        private _createPositionTransformer(color: Color3, id: number): Mesh {
            var mesh = Mesh.CreateCylinder("PositionTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
            mesh.scaling = this._sharedScale;
            mesh.isPickable = true;

            var mesh2 = Mesh.CreateCylinder("PositionTransformerCross" + id, 2, 0, 3, 8, 1, this._scene, true);
            mesh2.isPickable = true;
            mesh2.parent = mesh;
            mesh2.scaling = new Vector3(1.3, 1.3, 1.3);
            mesh2.position.y = 5;

            var material = new StandardMaterial("PositionTransformerMaterial" + id, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }

        // Create rotation transformer
        private _createRotationTransformer(color: Color3, id: number): Mesh {
            var mesh = Mesh.CreateTorus("RotationTransformer" + id, 20, 0.75, 35, this._scene, true);
            mesh.scaling = this._sharedScale;

            var material = new StandardMaterial("RotationTransformerMaterial" + id, this._scene);
            material.emissiveColor = color;
            mesh.material = material;

            return mesh;
        }

        // Create scale transformer
        private _createScalingTransformer(color: Color3, id: number): Mesh {
            var mesh = Mesh.CreateCylinder("ScalingTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
            mesh.scaling = this._sharedScale;
            mesh.isPickable = true;

            var mesh2 = Mesh.CreateBox("ScalingTransformerBox" + id, 2, this._scene, true);
            mesh.isPickable = true;
            mesh2.parent = mesh;
            mesh2.position.y = 5;

            var material = new StandardMaterial("ScalingTransformerMaterial" + id, this._scene);
            material.emissiveColor = color;

            mesh.material = material;
            mesh2.material = material;

            return mesh;
        }
    }
}