var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectImporter = (function () {
            function ProjectImporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Imports the project
            ProjectImporter.ImportProject = function (core, data) {
                var project = JSON.parse(data);
                EDITOR.Tools.CleanProject(project);
                // First, create the render targets (maybe used by the materials)
                // (serialized materials will be able to retrieve the textures)
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe) {
                        var reflectionProbe = new BABYLON.ReflectionProbe(rt.serializationObject.name, rt.serializationObject.size, core.currentScene, rt.serializationObject.generateMipMaps);
                        reflectionProbe._waitingRenderList = rt.serializationObject.renderList;
                        rt.waitingTexture = reflectionProbe;
                    }
                    else {
                        var texture = BABYLON.Texture.Parse(rt.serializationObject, core.currentScene, "./");
                        texture._waitingRenderList = undefined;
                        rt.waitingTexture = texture;
                        BABYLON.Tags.EnableFor(texture);
                        BABYLON.Tags.AddTagsTo(texture, "added");
                    }
                }
                // Second, create materials
                // (serialized meshes will be able to retrieve the materials)
                // Etc.
                for (var i = 0; i < project.materials.length; i++) {
                    var material = project.materials[i];
                    // For now, continue
                    // If no customType, the changes can be done in the modeler (3ds Max, Blender, Unity3D, etc.)
                    if (!material.newInstance || !material.serializedValues.customType)
                        continue;
                    var materialType = BABYLON.Tools.Instantiate(material.serializedValues.customType);
                    material._babylonMaterial = materialType.Parse(material.serializedValues, core.currentScene, "./");
                }
                // Parse the nodes
                for (var i = 0; i < project.nodes.length; i++) {
                    var node = project.nodes[i];
                    var newNode = null;
                    switch (node.type) {
                        case "Mesh":
                        case "Light":
                        case "Camera":
                            if (node.serializationObject) {
                                if (node.type === "Mesh") {
                                    var vertexDatas = node.serializationObject.geometries.vertexData;
                                    for (var vertexDataIndex = 0; vertexDataIndex < vertexDatas.length; vertexDataIndex++) {
                                        BABYLON.Geometry.Parse(vertexDatas[vertexDataIndex], core.currentScene, "./");
                                    }
                                    var meshes = node.serializationObject.meshes;
                                    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                                        newNode = BABYLON.Mesh.Parse(meshes[meshIndex], core.currentScene, "./");
                                        BABYLON.Tags.EnableFor(newNode);
                                    }
                                }
                                else if (node.type === "Light") {
                                    newNode = BABYLON.Light.Parse(node.serializationObject, core.currentScene);
                                }
                                else if (node.type === "Camera") {
                                    newNode = BABYLON.Camera.Parse(node.serializationObject, core.currentScene);
                                }
                            }
                            else {
                                newNode = core.currentScene.getNodeByName(node.name);
                            }
                            break;
                        case "Scene":
                            newNode = core.currentScene;
                            break;
                        default:
                            continue;
                    }
                    // Check particles system
                    if (!newNode) {
                        for (var psIndex = 0; psIndex < project.particleSystems.length; psIndex++) {
                            var ps = project.particleSystems[psIndex];
                            if (!ps.hasEmitter && node.id && ps.serializationObject && ps.serializationObject.emitterId === node.id) {
                                newNode = new BABYLON.Mesh(node.name, core.currentScene, null, null, true);
                                newNode.id = node.id;
                                BABYLON.Tags.EnableFor(newNode);
                                BABYLON.Tags.AddTagsTo(newNode, "added_particlesystem");
                                break;
                            }
                        }
                    }
                    if (!newNode) {
                        BABYLON.Tools.Warn("Cannot configure node named " + node.name + " , with ID " + node.id);
                        continue;
                    }
                    // Animations
                    if (node.animations.length > 0 && !newNode.animations)
                        newNode.animations = [];
                    for (var animationIndex = 0; animationIndex < node.animations.length; animationIndex++) {
                        var animation = node.animations[animationIndex];
                        var newAnimation = BABYLON.Animation.Parse(animation.serializationObject);
                        newNode.animations.push(newAnimation);
                        BABYLON.Tags.EnableFor(newAnimation);
                        BABYLON.Tags.AddTagsTo(newAnimation, "modified");
                    }
                }
                // Particle systems
                for (var i = 0; i < project.particleSystems.length; i++) {
                    var ps = project.particleSystems[i];
                    var newPs = BABYLON.ParticleSystem.Parse(ps.serializationObject, core.currentScene, "./");
                    var buffer = ps.serializationObject.base64Texture;
                    newPs.particleTexture = BABYLON.Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, core.currentScene);
                    newPs.particleTexture.name = newPs.particleTexture.name.replace("data:", "");
                    if (!ps.hasEmitter && ps.emitterPosition)
                        newPs.emitter.position = BABYLON.Vector3.FromArray(ps.emitterPosition);
                    newPs.emitter.attachedParticleSystem = newPs;
                }
                // Lens flares
                for (var i = 0; i < project.lensFlares.length; i++) {
                    var lf = project.lensFlares[i];
                    var newLf = BABYLON.LensFlareSystem.Parse(lf.serializationObject, core.currentScene, "./");
                    for (var i = 0; i < newLf.lensFlares.length; i++) {
                        var flare = lf.serializationObject.flares[i];
                        newLf.lensFlares[i].texture = BABYLON.Texture.CreateFromBase64String(flare.base64Buffer, flare.base64Name.replace("data:", ""), core.currentScene);
                    }
                }
                // Shadow generators
                for (var i = 0; i < project.shadowGenerators.length; i++) {
                    var shadows = project.shadowGenerators[i];
                    var newShadowGenerator = BABYLON.ShadowGenerator.Parse(shadows, core.currentScene);
                    BABYLON.Tags.EnableFor(newShadowGenerator);
                    BABYLON.Tags.AddTagsTo(newShadowGenerator, "added");
                    newShadowGenerator.getShadowMap().renderList.some(function (value, index, array) {
                        if (!value) {
                            array.splice(index, 1);
                            return true;
                        }
                        return false;
                    });
                }
                // Set global animations
                EDITOR.SceneFactory.AnimationSpeed = project.globalConfiguration.globalAnimationSpeed;
                EDITOR.GUIAnimationEditor.FramesPerSecond = project.globalConfiguration.framesPerSecond || EDITOR.GUIAnimationEditor.FramesPerSecond;
                core.editor.sceneToolbar.setFramesPerSecond(EDITOR.GUIAnimationEditor.FramesPerSecond);
                for (var i = 0; i < project.globalConfiguration.animatedAtLaunch.length; i++) {
                    var animated = project.globalConfiguration.animatedAtLaunch[i];
                    switch (animated.type) {
                        case "Scene":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene);
                            break;
                        case "Node":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getNodeByName(animated.name));
                            break;
                        case "Sound":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getSoundByName(animated.name));
                            break;
                        case "ParticleSystem":
                            EDITOR.SceneFactory.NodesToStart.push(EDITOR.Tools.GetParticleSystemByName(core.currentScene, animated.name));
                            break;
                        default: break;
                    }
                }
                // Post processes
                for (var i = 0; i < project.postProcesses.length; i++) {
                    var pp = project.postProcesses[i];
                    if (EDITOR.SceneFactory["Create" + pp.name]) {
                        var newPp = EDITOR.SceneFactory["Create" + pp.name](core, pp.serializationObject);
                        if (pp.attach !== undefined && !pp.attach) {
                            newPp._detachCameras(core.currentScene.cameras);
                        }
                    }
                }
                // Render tagets, fill waiting renderlists
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe && rt.serializationObject.attachedMeshId) {
                        rt.waitingTexture.attachToMesh(core.currentScene.getMeshByID(rt.serializationObject.attachedMeshId));
                    }
                    for (var renderId = 0; renderId < rt.serializationObject.renderList.length; renderId++) {
                        var obj = core.currentScene.getMeshByID(rt.serializationObject.renderList[renderId]);
                        if (obj)
                            rt.waitingTexture.renderList.push(obj);
                    }
                }
                // Set materials
                for (var i = 0; i < project.materials.length; i++) {
                    var material = project.materials[i];
                    if (!material.meshesNames || !material.serializedValues.customType)
                        continue;
                    var meshesNames = project.materials[i].meshesNames;
                    for (var meshName = 0; meshName < meshesNames.length; meshName++) {
                        var mesh = core.currentScene.getMeshByName(meshesNames[meshName]);
                        if (mesh)
                            mesh.material = project.materials[i]._babylonMaterial;
                    }
                }
            };
            return ProjectImporter;
        })();
        EDITOR.ProjectImporter = ProjectImporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
