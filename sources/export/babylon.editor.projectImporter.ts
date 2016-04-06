module BABYLON.EDITOR {
    export class ProjectImporter {
        // Public members
        // None

        // Private members
        // None

        // Imports the project
        public static ImportProject(core: EditorCore, data: string): void {
            var project: INTERNAL.IProjectRoot = JSON.parse(data);
            Tools.CleanProject(project);

            // First, create the render targets (maybe used by the materials)
            // (serialized materials will be able to retrieve the textures)
            for (var i = 0; i < project.renderTargets.length; i++) {
                var rt = project.renderTargets[i];

                if (rt.isProbe) {
                    var reflectionProbe = new ReflectionProbe(rt.serializationObject.name, rt.serializationObject.size, core.currentScene, rt.serializationObject.generateMipMaps);
                    (<any>reflectionProbe)._waitingRenderList = rt.serializationObject.renderList;
                    rt.waitingTexture = reflectionProbe;
                }
                else {
                    var texture = <RenderTargetTexture>Texture.Parse(rt.serializationObject, core.currentScene, "./");
                    texture._waitingRenderList = undefined;
                    rt.waitingTexture = texture;

                    Tags.EnableFor(texture);
                    Tags.AddTagsTo(texture, "added");
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
                var newNode: Node | Scene | Sound = null;

                switch (node.type) {
                    case "Mesh":
                    case "Light":
                    case "Camera":
                        if (node.serializationObject) {
                            if (node.type === "Mesh") {
                                var vertexDatas: any[] = node.serializationObject.geometries.vertexData;
                                for (var vertexDataIndex = 0; vertexDataIndex < vertexDatas.length; vertexDataIndex++) {
                                    Geometry.Parse(vertexDatas[vertexDataIndex], core.currentScene, "./");
                                }

                                var meshes: any[] = node.serializationObject.meshes;
                                for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                                    newNode = BABYLON.Mesh.Parse(meshes[meshIndex], core.currentScene, "./");

                                    Tags.EnableFor(newNode);
                                    //Tags.AddTagsTo(newNode, meshes[meshIndex].tags);
                                }
                            }
                            else if (node.type === "Light") {
                                newNode = Light.Parse(node.serializationObject, core.currentScene);
                            }
                            else if (node.type === "Camera") {
                                newNode = Camera.Parse(node.serializationObject, core.currentScene);
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
                            newNode = new Mesh(node.name, core.currentScene, null, null, true);
                            (<Mesh>newNode).id = node.id;
                            Tags.EnableFor(newNode);
                            Tags.AddTagsTo(newNode, "added_particlesystem");
                            break;
                        }
                    }
                }

                if (!newNode) {
                    BABYLON.Tools.Warn("Cannot configure node named " + node.name + " , with ID " + node.id);
                    continue;
                }

                // Animations
                if (node.animations.length > 0 && !(<any>newNode).animations)
                    (<any>newNode).animations = [];

                for (var animationIndex = 0; animationIndex < node.animations.length; animationIndex++) {
                    var animation = node.animations[animationIndex];

                    var newAnimation = Animation.Parse(animation.serializationObject);
                    (<any>newNode).animations.push(newAnimation);

                    Tags.EnableFor(newAnimation);
                    Tags.AddTagsTo(newAnimation, "modified");
                }
            }

            // Particle systems
            for (var i = 0; i < project.particleSystems.length; i++) {
                var ps = project.particleSystems[i];
                var newPs = ParticleSystem.Parse(ps.serializationObject, core.currentScene, "./");

                var buffer = ps.serializationObject.base64Texture;
                newPs.particleTexture = Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, core.currentScene);
                newPs.particleTexture.name = newPs.particleTexture.name.replace("data:", "");

                if (!ps.hasEmitter && ps.emitterPosition)
                    newPs.emitter.position = Vector3.FromArray(ps.emitterPosition);

                newPs.emitter.attachedParticleSystem = newPs;
            }

            // Lens flares
            for (var i = 0; i < project.lensFlares.length; i++) {
                var lf = project.lensFlares[i];
                var newLf = LensFlareSystem.Parse(lf.serializationObject, core.currentScene, "./");

                for (var i = 0; i < newLf.lensFlares.length; i++) {
                    var flare = lf.serializationObject.flares[i];
                    newLf.lensFlares[i].texture = Texture.CreateFromBase64String(flare.base64Buffer, flare.base64Name.replace("data:", ""), core.currentScene);
                }
            }

            // Shadow generators
            for (var i = 0; i < project.shadowGenerators.length; i++) {
                var shadows = project.shadowGenerators[i];

                var newShadowGenerator = ShadowGenerator.Parse(shadows, core.currentScene);
                Tags.EnableFor(newShadowGenerator);
                Tags.AddTagsTo(newShadowGenerator, "added");

                newShadowGenerator.getShadowMap().renderList.some((value: AbstractMesh, index: number, array: AbstractMesh[]) => {
                    if (!value) {
                        array.splice(index, 1);
                        return true;
                    }

                    return false;
                });
            }

            // Set global animations
            SceneFactory.AnimationSpeed = project.globalConfiguration.globalAnimationSpeed;
            
            GUIAnimationEditor.FramesPerSecond = project.globalConfiguration.framesPerSecond || GUIAnimationEditor.FramesPerSecond;
            core.editor.sceneToolbar.setFramesPerSecond(GUIAnimationEditor.FramesPerSecond);

            for (var i = 0; i < project.globalConfiguration.animatedAtLaunch.length; i++) {
                var animated = project.globalConfiguration.animatedAtLaunch[i];

                switch (animated.type) {
                    case "Scene": SceneFactory.NodesToStart.push(core.currentScene); break;
                    case "Node": SceneFactory.NodesToStart.push(core.currentScene.getNodeByName(animated.name)); break;
                    case "Sound": SceneFactory.NodesToStart.push(<any>core.currentScene.getSoundByName(animated.name)); break;
                    case "ParticleSystem": SceneFactory.NodesToStart.push(Tools.GetParticleSystemByName(core.currentScene, animated.name)); break;
                    default: break;
                }
            }

            // Post processes
            for (var i = 0; i < project.postProcesses.length; i++) {
                var pp = project.postProcesses[i];
                
                if (SceneFactory["Create" + pp.name]) {
                    var newPp = SceneFactory["Create" + pp.name](core, pp.serializationObject);

                    if (pp.attach !== undefined && !pp.attach) {
                        (<PostProcessRenderPipeline>newPp)._detachCameras(core.currentScene.cameras);
                    }
                }
            }

            // Render tagets, fill waiting renderlists
            for (var i = 0; i < project.renderTargets.length; i++) {
                var rt = project.renderTargets[i];

                if (rt.isProbe && rt.serializationObject.attachedMeshId) {
                    (<ReflectionProbe>rt.waitingTexture).attachToMesh(core.currentScene.getMeshByID(rt.serializationObject.attachedMeshId));
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
        }
    }
}