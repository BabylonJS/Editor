module BABYLON.EDITOR.EXTENSIONS {
    export interface ISoftBodyData {
        meshName: string;
    }

    export interface ISoftBodyConfiguration extends ISoftBodyData {
        spheres: Mesh[];
        beforeRenderFunction?: () => void;
    }

    export class SoftBodyBuilderExtension implements IEditorExtension<ISoftBodyData[]> {
        // IEditorExtension members
        public extensionKey: string = "SoftBodyBuilder";
        public applyEvenIfDataIsNull: boolean = false;

        // Public members
        public configs: ISoftBodyConfiguration[] = [];

        // Private members
        private _scene: Scene;

        /**
        * Constructor
        * @param scene: the babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this._scene = scene;
        }

        // Applies the extension
        public apply(data: ISoftBodyData[]): void {
            // Clear
            for (var i = 0; i < this.configs.length; i++) {
                var config = this.configs[i];

                if (config.beforeRenderFunction)
                    this._scene.unregisterBeforeRender(config.beforeRenderFunction);
                
                for (var j = 0; j < config.spheres.length; j++) {
                    config.spheres[j].dispose(true);
                }
            }

            // Create
            for (var i = 0; i < data.length; i++) {
                // Configure mesh
                var mesh = this._scene.getMeshByName(data[i].meshName);
                if (mesh && mesh instanceof GroundMesh)
                    this._configureMesh(mesh, i);
            }
        }

        // Returns the configuration for the given mesh name
        public getConfiguration(meshName: string): ISoftBodyConfiguration {
            for (var i = 0; i < this.configs.length; i++) {
                if (this.configs[i].meshName === meshName)
                    return this.configs[i];
            }

            return null;
        }

        // Configure the mesh and physics
        private _configureMesh(mesh: GroundMesh, index: number): void {
            var config: ISoftBodyConfiguration = {
                meshName: mesh.name,
                spheres: []
            };

            var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            var distanceBetweenPoints = mesh._width / (mesh.subdivisions + 1);

            // Create spheres
            for (var i = 0; i < positions.length; i += 3) {
                var v = BABYLON.Vector3.FromArray(positions, i);
                var sphere = BABYLON.MeshBuilder.CreateSphere("s" + i, { diameter: 0.1 }, this._scene);

                sphere.position.copyFrom(v);

                config.spheres.push(sphere);
            }

            // Create impostors
            for (var i = 0; i < config.spheres.length; i++) {
                var point = config.spheres[i];
                var mass = i < (mesh.subdivisions + 1) ? 0 : 1;

                point.physicsImpostor = new PhysicsImpostor(point, BABYLON.PhysicsImpostor.ParticleImpostor, { mass: mass }, this._scene);

                if (i >= (mesh.subdivisions + 1)) {
                    this._createJoint(point.physicsImpostor, config.spheres[i - (mesh.subdivisions + 1)].physicsImpostor, distanceBetweenPoints);

                    if (i % (mesh.subdivisions + 1)) {
                        this._createJoint(point.physicsImpostor, config.spheres[i - 1].physicsImpostor, distanceBetweenPoints);
                    }
                }
            }

            // Update function
            config.beforeRenderFunction = () => {
                var positions = [];
                
                for (var i = 0; i < config.spheres.length; i++) {
                    var s = config.spheres[i];
                    positions.push(s.position.x, s.position.y, s.position.z);
                }

                mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                mesh.refreshBoundingInfo();
            };

            this._scene.registerBeforeRender(config.beforeRenderFunction);

            // Finish
            this.configs.push(config);
        }

        // Creates a joint
        private _createJoint(impostor1: PhysicsImpostor, impostor2: PhysicsImpostor, distanceBetweenPoints: number): void {
            var joint = new BABYLON.DistanceJoint({
                maxDistance: distanceBetweenPoints
            });

            impostor1.addJoint(impostor2, joint);
        }
    }
}
