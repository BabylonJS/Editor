var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectExporter = (function () {
            function ProjectExporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Exports the project
            ProjectExporter.ExportProject = function (core, requestMaterials) {
                if (requestMaterials === void 0) { requestMaterials = false; }
                BABYLON.SceneSerializer.ClearCache();
                var project = {
                    globalConfiguration: this._SerializeGlobalAnimations(),
                    materials: [],
                    particleSystems: [],
                    nodes: [],
                    shadowGenerators: [],
                    postProcesses: this._SerializePostProcesses(),
                    lensFlares: this._SerializeLensFlares(core),
                    requestedMaterials: requestMaterials ? [] : undefined
                };
                this._TraverseNodes(core, null, project);
                return JSON.stringify(project, null, "\t");
            };
            // Serialize global animations
            ProjectExporter._SerializeGlobalAnimations = function () {
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
                    else if (node instanceof BABYLON.ParticleSystem) {
                        type = "ParticleSystem";
                    }
                    var obj = {
                        name: node.name,
                        type: type
                    };
                    config.animatedAtLaunch.push(obj);
                }
                return config;
            };
            // Serialize lens flares
            ProjectExporter._SerializeLensFlares = function (core) {
                var config = [];
                for (var i = 0; i < core.currentScene.lensFlareSystems.length; i++) {
                    var lf = core.currentScene.lensFlareSystems[i];
                    var obj = {
                        serializationObject: lf.serialize()
                    };
                    var flares = obj.serializationObject.flares;
                    for (var i = 0; i < flares.length; i++) {
                        flares[i].base64Name = flares[i].textureName;
                        delete flares[i].textureName;
                        flares[i].base64Buffer = lf.lensFlares[i].texture._buffer;
                    }
                    config.push(obj);
                }
                return config;
            };
            // Serialize  post-processes
            ProjectExporter._SerializePostProcesses = function () {
                var config = [];
                var serialize = function (object) {
                    var obj = {};
                    for (var thing in object) {
                        if (typeof object[thing] === "number" && thing[0] !== "_")
                            obj[thing] = object[thing];
                    }
                    return obj;
                };
                if (EDITOR.SceneFactory.HDRPipeline) {
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachHDR,
                        name: "HDRPipeline",
                        serializationObject: serialize(EDITOR.SceneFactory.HDRPipeline)
                    });
                }
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachSSAO,
                        name: "SSAOPipeline",
                        serializationObject: serialize(EDITOR.SceneFactory.SSAOPipeline)
                    });
                }
                return config;
            };
            // Traverses nodes
            ProjectExporter._TraverseNodes = function (core, node, project) {
                var scene = core.currentScene;
                if (!node) {
                    this._TraverseNodes(core, core.currentScene, project);
                    var rootNodes = [];
                    this._FillRootNodes(core, rootNodes, "lights");
                    this._FillRootNodes(core, rootNodes, "cameras");
                    this._FillRootNodes(core, rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        this._TraverseNodes(core, rootNodes[i], project);
                    }
                }
                else {
                    if (node !== core.camera) {
                        // Check particle systems
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                var psObj = {
                                    hasEmitter: !(BABYLON.Tags.HasTags(node) && BABYLON.Tags.MatchesQuery(node, "added_particlesystem")),
                                    serializationObject: ps.serialize()
                                };
                                if (!psObj.hasEmitter)
                                    psObj.emitterPosition = ps.emitter.position.asArray();
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
                                            serializedValues: subMaterial.serialize()
                                        };
                                        project.materials.push(matObj);
                                        this._RequestMaterial(core, project, subMaterial);
                                    }
                                }
                            }
                            var matObj = {
                                meshName: node.name,
                                newInstance: true,
                                serializedValues: material.serialize()
                            };
                            project.materials.push(matObj);
                            this._RequestMaterial(core, project, material);
                        }
                        // Check modified nodes
                        var nodeObj = {
                            name: node instanceof BABYLON.Scene ? "Scene" : node.name,
                            id: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : node.id,
                            type: node instanceof BABYLON.Scene ? "Scene"
                                : node instanceof BABYLON.Sound ? "Sound"
                                    : node instanceof BABYLON.Light ? "Light"
                                        : node instanceof BABYLON.Camera ? "Camera"
                                            : "Mesh",
                            animations: []
                        };
                        var addNodeObj = false;
                        if (BABYLON.Tags.HasTags(node)) {
                            if (BABYLON.Tags.MatchesQuery(node, "added_particlesystem"))
                                addNodeObj = true;
                            if (BABYLON.Tags.MatchesQuery(node, "added")) {
                                addNodeObj = true;
                                if (node instanceof BABYLON.Mesh) {
                                    nodeObj.serializationObject = BABYLON.SceneSerializer.SerializeMesh(node, false, false);
                                    for (var meshIndex = 0; meshIndex < nodeObj.serializationObject.meshes.length; meshIndex++)
                                        delete nodeObj.serializationObject.meshes[meshIndex].animations;
                                }
                                else {
                                    nodeObj.serializationObject = node.serialize();
                                    delete nodeObj.serializationObject.animations;
                                }
                                delete nodeObj.serializationObject.animations;
                            }
                        }
                        // Shadow generators
                        if (node instanceof BABYLON.Light) {
                            var shadows = node.getShadowGenerator();
                            if (shadows && BABYLON.Tags.HasTags(shadows) && BABYLON.Tags.MatchesQuery(shadows, "added"))
                                project.shadowGenerators.push(node.getShadowGenerator().serialize());
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
                            this._TraverseNodes(core, node.getDescendants()[i], project);
                        }
                    }
                }
            };
            // Setups the requested materials (to be uploaded in template or release)
            ProjectExporter._RequestMaterial = function (core, project, material) {
                if (!material || material instanceof BABYLON.StandardMaterial || material instanceof BABYLON.MultiMaterial || !project.requestedMaterials)
                    return;
                var constructorName = BABYLON.Tools.GetConstructorName(material);
                var index = project.requestedMaterials.indexOf(constructorName);
                if (index === -1)
                    project.requestedMaterials.push(constructorName);
            };
            // Fills array of root nodes
            ProjectExporter._FillRootNodes = function (core, data, propertyPath) {
                var scene = core.currentScene;
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