module BABYLON.EDITOR {
    export class ProjectExporter {
        // Public members

        // Private members
        private _core: EditorCore;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            this._core = core;
        }

        // Exports the project
        public exportProject(): string {

            var project: INTERNAL.IProjectRoot = {
                globalConfiguration: this._serializeGlobalAnimations(),
                materials: [],
                particleSystems: [],
                nodes: []
            };

            this._traverseNodes(null, project);

            return JSON.stringify(project, null, "\t");
        }

        // Serialize global animations
        private _serializeGlobalAnimations(): INTERNAL.IAnimationConfiguration {
            var config: INTERNAL.IAnimationConfiguration = {
                globalAnimationSpeed: SceneFactory.AnimationSpeed,
                animatedAtLaunch: []
            };

            for (var i = 0; i < SceneFactory.NodesToStart.length; i++) {
                var node = SceneFactory.NodesToStart[i];
                var type = "Node";

                if (node instanceof Scene) {
                    type = "Scene";
                }
                else if (node instanceof Sound) {
                    type = "Sound";
                }

                var obj: INTERNAL.IAnimationConfigurationOnPlay = {
                    name: (<any>node).name,
                    type: type
                }
                config.animatedAtLaunch.push(obj);
            }

            return config;
        }

        // Traverses nodes
        private _traverseNodes(node: Node | Scene | Sound, project: INTERNAL.IProjectRoot): void {
            var scene = this._core.currentScene;

            if (!node) {
                this._traverseNodes(this._core.currentScene, project);

                var rootNodes: any[] = [];

                this._fillRootNodes(rootNodes, "lights");
                this._fillRootNodes(rootNodes, "cameras");
                this._fillRootNodes(rootNodes, "meshes");

                for (var i = 0; i < rootNodes.length; i++) {
                    this._traverseNodes(rootNodes[i], project);
                }
            }
            else {
                if (node !== this._core.camera) {
                    // Check particle systems
                    for (var i = 0; i < scene.particleSystems.length; i++) {
                        var ps = scene.particleSystems[i];
                        if (ps.emitter === node) {
                            var psObj: INTERNAL.IParticleSystem = {
                                hasEmitter: node instanceof Mesh ? node.geometry === null : false,
                                serializationObject: ps.serialize()
                            };

                            // Patch texture base64 string
                            psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                            psObj.serializationObject.base64Texture = (<any>ps.particleTexture)._buffer;
                            delete psObj.serializationObject.textureName;

                            project.particleSystems.push(psObj);
                        }
                    }

                    // Check materials
                    if (node instanceof AbstractMesh && node.material && !(node.material instanceof StandardMaterial)) {
                        var material = node.material;

                        if (material instanceof MultiMaterial) {
                            for (var materialIndex = 0; materialIndex < material.subMaterials.length; materialIndex++) {
                                var subMaterial = material.subMaterials[materialIndex];

                                if (!(subMaterial instanceof StandardMaterial)) {
                                    var matObj: INTERNAL.IMaterial = {
                                        meshName: node.name,
                                        newInstance: true,
                                        serializedValues: material.serialize()
                                    };

                                    project.materials.push(matObj);
                                }
                            }
                        }

                        var matObj: INTERNAL.IMaterial = {
                            meshName: node.name,
                            newInstance: true,
                            serializedValues: material.serialize()
                        };

                        project.materials.push(matObj);
                    }

                    // Check modified nodes
                    var nodeObj: INTERNAL.INode = {
                        name: node instanceof Scene ? "Scene" : (<Sound | Node>node).name,
                        type: node instanceof Scene ? "Scene"
                            : node instanceof Sound ? "Sound"
                            : node instanceof Light ? "Light"
                            : node instanceof Camera ? "Camera"
                            : "Mesh",
                        animations: []
                    };
                    var addNodeObj = false;

                    if (BABYLON.Tags.HasTags(node)) { // Maybe modified by the editor
                        if (Tags.MatchesQuery(node, "added")) {
                            addNodeObj = true;

                            if (node instanceof Mesh) {
                                nodeObj.serializationObject = SceneSerializer.SerializeMesh(node, false, false);
                            }
                            else {
                                nodeObj.serializationObject = (<Light | Camera>node).serialize();
                            }
                        }
                    }

                    // Check animations
                    if ((<any>node).animations) {
                        var animatable: IAnimatable = <any>node;
                        for (var animIndex = 0; animIndex < animatable.animations.length; animIndex++) {
                            var animation = animatable.animations[animIndex];
                            if (!Tags.HasTags(animation) || !Tags.MatchesQuery(animation, "modified"))
                                continue;

                            addNodeObj = true;

                            // Add values
                            var animObj: INTERNAL.IAnimation = {
                                events: [],
                                serializationObject: animation.serialize(),
                                targetName: node instanceof Scene ? "Scene" : (<Node | Sound>node).name,
                                targetType: node instanceof Scene ? "Scene" : node instanceof Sound ? "Sound" : "Node",
                            };

                            // Setup events
                            var keys = animation.getKeys();
                            for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                var events: INTERNAL.IAnimationEvent[] = keys[keyIndex].events;

                                if (!events)
                                    continue;

                                animObj.events.push({
                                    events: events,
                                    frame: keys[keyIndex].frame
                                });
                            }

                            // Add
                            nodeObj.animations.push(animObj);
                        }
                    }

                    // Add
                    if (addNodeObj) {
                        project.nodes.push(nodeObj);
                    }
                }

                if (node instanceof Node) {
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        this._traverseNodes(node.getDescendants()[i], project);
                    }
                }
            }
        }

        // Fills array of root nodes
        private _fillRootNodes(data: Node[], propertyPath: string): void {
            var scene = this._core.currentScene;
            var nodes: Node[] = scene[propertyPath];

            for (var i = 0; i < nodes.length; i++) {
                if (!nodes[i].parent)
                    data.push(nodes[i]);
            }
        }
    }
}