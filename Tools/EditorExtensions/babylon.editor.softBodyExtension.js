var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var SoftBodyBuilderExtension = (function () {
                /**
                * Constructor
                * @param scene: the babylon.js scene
                */
                function SoftBodyBuilderExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "SoftBodyBuilder";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.configs = [];
                    // Initialize
                    this._scene = scene;
                }
                // Applies the extension
                SoftBodyBuilderExtension.prototype.apply = function (data) {
                    if (!this._scene.isPhysicsEnabled()) {
                        BABYLON.Tools.Warn("Don't forget to enable physics to use soft body simulations");
                        return;
                    }
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
                        if (!data[i].applied)
                            continue;
                        // Configure mesh
                        var mesh = this._scene.getMeshByName(data[i].meshName);
                        if (mesh)
                            this._configureMesh(mesh, data[i]);
                    }
                };
                // Returns the configuration for the given mesh name
                SoftBodyBuilderExtension.prototype.getConfiguration = function (meshName) {
                    for (var i = 0; i < this.configs.length; i++) {
                        if (this.configs[i].meshName === meshName)
                            return this.configs[i];
                    }
                    return null;
                };
                // Configure the mesh and physics
                SoftBodyBuilderExtension.prototype._configureMesh = function (mesh, data) {
                    var config = {
                        meshName: mesh.name,
                        spheres: []
                    };
                    var positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    var distanceBetweenPoints = ((data.width * mesh.scaling.length()) / (data.subdivisions + 1)) * data.distanceFactor;
                    // Create spheres
                    for (var i = 0; i < positions.length; i += 3) {
                        var v = BABYLON.Vector3.FromArray(positions, i);
                        var sphere = BABYLON.MeshBuilder.CreateSphere("s" + i, { diameter: 0.1, segments: 1 }, this._scene);
                        sphere.isVisible = false;
                        sphere.position.copyFrom(v);
                        config.spheres.push(sphere);
                    }
                    // Create impostors
                    for (var i = 0; i < config.spheres.length; i++) {
                        var point = config.spheres[i];
                        var mass = i < (data.subdivisions + 1) ? 0.0 : 1.0;
                        if (data.freeFall)
                            mass = 1.0;
                        else if (data.onlySelectedJoints)
                            mass = i > data.firstJoints ? 1.0 : 0.0;
                        point.physicsImpostor = new BABYLON.PhysicsImpostor(point, BABYLON.PhysicsImpostor.ParticleImpostor, { mass: mass }, this._scene);
                        if (i >= (data.subdivisions + 1)) {
                            this._createJoint(point.physicsImpostor, config.spheres[i - (data.subdivisions + 1)].physicsImpostor, distanceBetweenPoints);
                            if (i % (data.subdivisions + 1)) {
                                this._createJoint(point.physicsImpostor, config.spheres[i - 1].physicsImpostor, distanceBetweenPoints);
                            }
                        }
                    }
                    // Update function
                    var engine = this._scene.getEngine();
                    var lastForceTime = 0;
                    var direction = data.constantForceDirection;
                    positions = new Array(config.spheres.length * 3);
                    config.beforeRenderFunction = function () {
                        // Update force (wind)
                        if (lastForceTime >= data.constantForceInterval) {
                            for (var i = 0; i < config.spheres.length; i++) {
                                var force = Math.random() * data.constantForce;
                                config.spheres[i].applyImpulse(new BABYLON.Vector3(direction.x * force, direction.y * force, direction.z * force), BABYLON.Vector3.Zero());
                            }
                            lastForceTime = 0;
                        }
                        lastForceTime += engine.getDeltaTime();
                        // Update vertices
                        if (!mesh.isVisible)
                            return;
                        for (var i = 0; i < config.spheres.length; i++) {
                            var s = config.spheres[i];
                            positions[i * 3] = s.position.x * mesh.scaling.x;
                            positions[i * 3 + 1] = s.position.y * mesh.scaling.y;
                            positions[i * 3 + 2] = s.position.z * mesh.scaling.z;
                        }
                        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                        mesh.refreshBoundingInfo();
                    };
                    this._scene.registerBeforeRender(config.beforeRenderFunction);
                    // Finish
                    this.configs.push(config);
                };
                // Creates a joint
                SoftBodyBuilderExtension.prototype._createJoint = function (impostor1, impostor2, distanceBetweenPoints) {
                    var joint = new BABYLON.DistanceJoint({
                        maxDistance: distanceBetweenPoints
                    });
                    impostor1.addJoint(impostor2, joint);
                };
                return SoftBodyBuilderExtension;
            }());
            EXTENSIONS.SoftBodyBuilderExtension = SoftBodyBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(SoftBodyBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.softBodyExtension.js.map