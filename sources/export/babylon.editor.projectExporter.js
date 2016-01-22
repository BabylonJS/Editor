var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ProjectExporter(core) {
                this._core = core;
            }
            // Exports the project
            ProjectExporter.prototype.exportProject = function () {
                var project = {
                    globalConfiguration: this._serializeGlobalAnimations(),
                    materials: [],
                    particleSystems: [],
                    nodes: []
                };
                this._traverseNodes(null, project);
                return JSON.stringify(project, null, "\t");
            };
            // Serialize global animations
            ProjectExporter.prototype._serializeGlobalAnimations = function () {
                var config = {
                    globalAnimationSpeed: EDITOR.SceneFactory.AnimationSpeed,
                    animatedAtLaunch: []
                };
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    var type = "Node";
                    if (node instanceof BABYLON.Scene) {
                        type = "Scene";
                    }
                    else if (node instanceof BABYLON.Sound) {
                        type = "Sound";
                    }
                    var obj = {
                        name: node.name,
                        type: type
                    };
                    config.animatedAtLaunch.push(obj);
                }
                return config;
            };
            // Traverses nodes
            ProjectExporter.prototype._traverseNodes = function (node, project) {
                var scene = this._core.currentScene;
                if (!node) {
                    this._traverseNodes(this._core.currentScene, project);
                    var rootNodes = [];
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
                                var psObj = {
                                    hasEmitter: node instanceof BABYLON.Mesh ? node.geometry === null : false,
                                    serializationObject: ps.serialize()
                                };
                                // Patch texture base64 string
                                psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                                psObj.serializationObject.base64Texture = ps.particleTexture._buffer;
                                delete psObj.serializationObject.textureName;
                                project.particleSystems.push(psObj);
                            }
                        }
                        // Check materials
                        if (node instanceof BABYLON.AbstractMesh && node.material && !(node.material instanceof BABYLON.StandardMaterial)) {
                            var material = node.material;
                            if (material instanceof BABYLON.MultiMaterial) {
                                for (var materialIndex = 0; materialIndex < material.subMaterials.length; materialIndex++) {
                                    var subMaterial = material.subMaterials[materialIndex];
                                    if (!(subMaterial instanceof BABYLON.StandardMaterial)) {
                                        var matObj = {
                                            meshName: node.name,
                                            newInstance: true,
                                            serializedValues: material.serialize()
                                        };
                                        project.materials.push(matObj);
                                    }
                                }
                            }
                            var matObj = {
                                meshName: node.name,
                                newInstance: true,
                                serializedValues: material.serialize()
                            };
                            project.materials.push(matObj);
                        }
                        // Check modified nodes
                        var nodeObj = {
                            name: node instanceof BABYLON.Scene ? "Scene" : node.name,
                            type: node instanceof BABYLON.Scene ? "Scene"
                                : node instanceof BABYLON.Sound ? "Sound"
                                    : node instanceof BABYLON.Light ? "Light"
                                        : node instanceof BABYLON.Camera ? "Camera"
                                            : "Mesh",
                            animations: []
                        };
                        var addNodeObj = false;
                        if (BABYLON.Tags.HasTags(node)) {
                            if (BABYLON.Tags.MatchesQuery(node, "added")) {
                                addNodeObj = true;
                                if (node instanceof BABYLON.Mesh) {
                                    nodeObj.serializationObject = BABYLON.SceneSerializer.SerializeMesh(node, false, false);
                                }
                                else {
                                    nodeObj.serializationObject = node.serialize();
                                }
                            }
                        }
                        // Check animations
                        if (node.animations) {
                            var animatable = node;
                            for (var animIndex = 0; animIndex < animatable.animations.length; animIndex++) {
                                var animation = animatable.animations[animIndex];
                                if (!BABYLON.Tags.HasTags(animation) || !BABYLON.Tags.MatchesQuery(animation, "modified"))
                                    continue;
                                addNodeObj = true;
                                // Add values
                                var animObj = {
                                    events: [],
                                    serializationObject: animation.serialize(),
                                    targetName: node instanceof BABYLON.Scene ? "Scene" : node.name,
                                    targetType: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : "Node",
                                };
                                // Setup events
                                var keys = animation.getKeys();
                                for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                    var events = keys[keyIndex].events;
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
                    if (node instanceof BABYLON.Node) {
                        for (var i = 0; i < node.getDescendants().length; i++) {
                            this._traverseNodes(node.getDescendants()[i], project);
                        }
                    }
                }
            };
            // Fills array of root nodes
            ProjectExporter.prototype._fillRootNodes = function (data, propertyPath) {
                var scene = this._core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return ProjectExporter;
        })();
        EDITOR.ProjectExporter = ProjectExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.projectExporter.js.map