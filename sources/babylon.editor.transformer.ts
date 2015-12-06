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
        private _node: Node = null;

        private _transformerType: TransformerType = TransformerType.POSITION;
        private _xTransformers: Mesh[] = new Array<Mesh>();
        private _yTransformers: Mesh[] = new Array<Mesh>();
        private _zTransformers: Mesh[] = new Array<Mesh>();

        private _sharedScale: Vector3 = Vector3.Zero();

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

            // Finish
            this._createTransformers();
        }

        // Event receiver
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_REMOVED) {
                    if (event.sceneEvent.data === this._node)
                        this._node = null;
                }
            }

            return false;
        }

        // On pre update
        public onPreUpdate(): void {
            // Update camera
            this._scene.activeCamera = this.core.currentScene.activeCamera;

            // Set transformer scale
            var distance = Vector3.Distance(this._scene.activeCamera.position, this._xTransformers[0].position) * 0.03;
            var scale = new Vector3(distance, distance, distance).divide(new Vector3(3, 3, 3));
            this._sharedScale.x = scale.x;
            this._sharedScale.y = scale.y;
            this._sharedScale.z = scale.z;

            // Update transformer (position is particular)
            this._xTransformers[0].position.copyFrom(Vector3.Zero());
            this._yTransformers[0].position.copyFrom(this._xTransformers[0].position);
            this._zTransformers[0].position.copyFrom(this._xTransformers[0].position);
            this._yTransformers[0].position.y += distance * 1.3;
            this._zTransformers[0].position.z += distance * 1.3;
            this._xTransformers[0].position.x += distance * 1.3;

            this._xTransformers[1].position.copyFrom(Vector3.Zero());
            this._yTransformers[1].position.copyFrom(Vector3.Zero());
            this._zTransformers[1].position.copyFrom(Vector3.Zero());

            this._xTransformers[2].position.copyFrom(this._xTransformers[0].position);
            this._yTransformers[2].position.copyFrom(this._yTransformers[0].position);
            this._zTransformers[2].position.copyFrom(this._zTransformers[0].position);
        }

        // On post update
        public onPostUpdate(): void {

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

        // Create transformers
        private _createTransformers(): void {
            var colors = [
                new Color3(0, 0, 1),
                new Color3(1, 0, 0),
                new Color3(0, 1, 0)
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