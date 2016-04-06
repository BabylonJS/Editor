module BABYLON.EDITOR {
    export class ProjectExporter {
        // Public members
        // None

        // Private members
        // None

        // Exports the project
        public static ExportProject(core: EditorCore, requestMaterials: boolean = false): string {
            SceneSerializer.ClearCache();
            
            var project: INTERNAL.IProjectRoot = {
                globalConfiguration: this._SerializeGlobalAnimations(),
                materials: [],
                particleSystems: [],
                nodes: [],
                shadowGenerators: [],
                postProcesses: this._SerializePostProcesses(),
                lensFlares: this._SerializeLensFlares(core),
                renderTargets: this._SerializeRenderTargets(core),

                requestedMaterials: requestMaterials ? [] : undefined
            };

            this._TraverseNodes(core, null, project);

            return JSON.stringify(project, null, "\t");
        }

        // Serialize global animations
        private static _SerializeGlobalAnimations(): INTERNAL.IAnimationConfiguration {
            var config: INTERNAL.IAnimationConfiguration = {
                globalAnimationSpeed: SceneFactory.AnimationSpeed,
                framesPerSecond: GUIAnimationEditor.FramesPerSecond,
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
                else if (node instanceof ParticleSystem) {
                    type = "ParticleSystem";
                }

                var obj: INTERNAL.IAnimationConfigurationOnPlay = {
                    name: (<any>node).name,
                    type: type
                }
                config.animatedAtLaunch.push(obj);
            }

            return config;
        }

        // Serialize render targets
        private static _SerializeRenderTargets(core: EditorCore): INTERNAL.IRenderTarget[] {
            var config: INTERNAL.IRenderTarget[] = [];
            var index = 0;

            // Probes
            for (index = 0; index < core.currentScene.reflectionProbes.length; index++) {
                var rp = core.currentScene.reflectionProbes[index];
                var attachedMesh = (<any>rp)._attachedMesh;

                var obj: INTERNAL.IRenderTarget = {
                    isProbe: true,
                    serializationObject: { }
                };

                if (attachedMesh) {
                    obj.serializationObject.attachedMeshId = attachedMesh.id;
                }

                obj.serializationObject.name = rp.name;
                obj.serializationObject.size = rp.cubeTexture.getBaseSize().width;
                obj.serializationObject.generateMipMaps = rp.cubeTexture._generateMipMaps;

                obj.serializationObject.renderList = [];
                for (var i = 0; i < rp.renderList.length; i++) {
                    obj.serializationObject.renderList.push(rp.renderList[i].id);
                }

                config.push(obj);
            }

            // Render targets
            for (index = 0; index < core.currentScene.customRenderTargets.length; index++) {
                var rt = core.currentScene.customRenderTargets[index];

                if (!Tags.HasTags(rt) || !Tags.MatchesQuery(rt, "added"))
                    continue;
                
                var obj: INTERNAL.IRenderTarget = {
                    isProbe: false,
                    serializationObject: rt.serialize()
                };

                config.push(obj);
            }

            return config;
        }

        // Serialize lens flares
        private static _SerializeLensFlares(core: EditorCore): INTERNAL.ILensFlare[] {
            var config: INTERNAL.ILensFlare[] = [];

            for (var i = 0; i < core.currentScene.lensFlareSystems.length; i++) {
                var lf = core.currentScene.lensFlareSystems[i];
                var obj: INTERNAL.ILensFlare = {
                    serializationObject: lf.serialize()
                };

                var flares = obj.serializationObject.flares;
                for (var i = 0; i < flares.length; i++) {
                    flares[i].base64Name = flares[i].textureName;
                    delete flares[i].textureName;
                    flares[i].base64Buffer = (<any>lf.lensFlares[i].texture)._buffer;
                }

                config.push(obj);
            }

            return config;
        }

        // Serialize  post-processes
        private static _SerializePostProcesses(): INTERNAL.IPostProcess[] {
            var config: INTERNAL.IPostProcess[] = [];

            var serialize = (object: any): any => {
                var obj = {};
                
                for (var thing in object) {
                    if (thing[0] === "_")
                        continue;

                    if (typeof object[thing] === "number")
                        obj[thing] = object[thing];

                    if (object[thing] instanceof Texture) {
                        obj[thing] = {
                            base64Name: (<Texture>object[thing]).name,
                            base64Buffer: object[thing]._buffer
                        };
                    }
                }

                return obj;
            };

            if (SceneFactory.HDRPipeline) {
                /*
                config.push({
                    attach: SceneFactory.EnabledPostProcesses.attachHDR,
                    name: "HDRPipeline",
                    serializationObject: serialize(SceneFactory.HDRPipeline)
                });
                */

                config.push({
                    attach: SceneFactory.EnabledPostProcesses.attachHDR,
                    name: "HDRPipeline",
                    serializationObject: this._ConfigureBase64Texture(SceneFactory.HDRPipeline, SceneFactory.HDRPipeline.serialize())
                });
            }
            if (SceneFactory.SSAOPipeline) {
                /*
                config.push({
                    attach: SceneFactory.EnabledPostProcesses.attachSSAO,
                    name: "SSAOPipeline",
                    serializationObject: serialize(SceneFactory.SSAOPipeline)
                });
                */

                config.push({
                    attach: SceneFactory.EnabledPostProcesses.attachSSAO,
                    name: "SSAOPipeline",
                    serializationObject: this._ConfigureBase64Texture(SceneFactory.SSAOPipeline, SceneFactory.SSAOPipeline.serialize())
                });
                
            }

            return config;
        }

        // Traverses nodes
        private static _TraverseNodes(core: EditorCore, node: Node | Scene | Sound, project: INTERNAL.IProjectRoot): void {
            var scene = core.currentScene;

            if (!node) {
                this._TraverseNodes(core, core.currentScene, project);

                var rootNodes: any[] = [];

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
                            var psObj: INTERNAL.IParticleSystem = {
                                hasEmitter: !(Tags.HasTags(node) && Tags.MatchesQuery(node, "added_particlesystem")), //node instanceof Mesh ? node.geometry === null : false,
                                serializationObject: ps.serialize()
                            };

                            if (!psObj.hasEmitter)
                                psObj.emitterPosition = ps.emitter.position.asArray();

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

                        if (!Tags.HasTags(material) || !Tags.MatchesQuery(material, "furShellMaterial")) {

                            if (material instanceof MultiMaterial) {
                                for (var materialIndex = 0; materialIndex < material.subMaterials.length; materialIndex++) {
                                    var subMaterial = material.subMaterials[materialIndex];

                                    if (!(subMaterial instanceof StandardMaterial)) {
                                        var matObj: INTERNAL.IMaterial = {
                                            meshesNames: [node.name],
                                            newInstance: true,
                                            serializedValues: subMaterial.serialize()
                                        };

                                        this._ConfigureMaterial(material, matObj);
                                        project.materials.push(matObj);

                                        this._RequestMaterial(core, project, subMaterial);
                                    }
                                }
                            }

                            var serializedMaterial = this._GetSerializedMaterial(project, material.name);
                            if (serializedMaterial) {
                                serializedMaterial.meshesNames.push(node.name);
                            }
                            else {
                                var matObj: INTERNAL.IMaterial = {
                                    meshesNames: [node.name],
                                    newInstance: true,
                                    serializedValues: material.serialize()
                                };

                                this._ConfigureMaterial(material, matObj);
                                project.materials.push(matObj);

                                this._RequestMaterial(core, project, material);
                            }
                        }
                    }

                    // Check modified nodes
                    var nodeObj: INTERNAL.INode = {
                        name: node instanceof Scene ? "Scene" : (<Sound | Node>node).name,
                        id: node instanceof Scene ? "Scene" : node instanceof Sound ? "Sound" : (<Node>node).id,
                        type: node instanceof Scene ? "Scene"
                            : node instanceof Sound ? "Sound"
                            : node instanceof Light ? "Light"
                            : node instanceof Camera ? "Camera"
                            : "Mesh",
                        animations: []
                    };
                    var addNodeObj = false;

                    if (Tags.HasTags(node)) { // Maybe modified by the editor
                        if (Tags.MatchesQuery(node, "added_particlesystem"))
                            addNodeObj = true;

                        if (Tags.MatchesQuery(node, "added")) {
                            addNodeObj = true;

                            if (node instanceof Mesh) {
                                nodeObj.serializationObject = SceneSerializer.SerializeMesh(node, false, false);

                                for (var meshIndex = 0; meshIndex < nodeObj.serializationObject.meshes.length; meshIndex++)
                                    delete nodeObj.serializationObject.meshes[meshIndex].animations;
                            }
                            else {
                                nodeObj.serializationObject = (<Light | Camera>node).serialize();
                                delete nodeObj.serializationObject.animations;
                            }

                            delete nodeObj.serializationObject.animations;
                        }
                    }

                    // Shadow generators
                    if (node instanceof Light) {
                        var shadows = node.getShadowGenerator();
                        if (shadows && Tags.HasTags(shadows) && Tags.MatchesQuery(shadows, "added"))
                            project.shadowGenerators.push(node.getShadowGenerator().serialize());
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
                        this._TraverseNodes(core, node.getDescendants()[i], project);
                    }
                }
            }
        }

        // Setups the requested materials (to be uploaded in template or release)
        private static _RequestMaterial(core: EditorCore, project: INTERNAL.IProjectRoot, material: Material): void {
            if (!material || material instanceof StandardMaterial || material instanceof MultiMaterial || !project.requestedMaterials)
                return;

            var constructorName = (<any>material).constructor ? (<any>material).constructor.name : null;
            if (!constructorName)
                return;

            var index = project.requestedMaterials.indexOf(constructorName);

            if (index === -1)
                project.requestedMaterials.push(constructorName);
        }

        // Returns if a material has been already serialized
        private static _GetSerializedMaterial(project: INTERNAL.IProjectRoot, materialName: string): INTERNAL.IMaterial {
            for (var i = 0; i < project.materials.length; i++) {
                if (project.materials[i].serializedValues.name === materialName)
                    return project.materials[i];
            }

            return null;
        }

        // Configures the material (configure base64 textures etc.)
        private static _ConfigureMaterial(material: Material, projectMaterial: INTERNAL.IMaterial): void {
            for (var thing in material) {
                var value = material[thing];

                if (!(value instanceof BaseTexture) || !projectMaterial.serializedValues[thing] || !(<any>value)._buffer)
                    continue;

                projectMaterial.serializedValues[thing].base64String = (<any>value)._buffer;
            }
        }

        // Configures the texture (configure base64 texture)
        private static _ConfigureBase64Texture(source: Object, objectToConfigure: Object): any {
            for (var thing in source) {
                var value = source[thing];

                if (!(value instanceof BaseTexture) || !objectToConfigure[thing] || !(<any>value)._buffer)
                    continue;

                objectToConfigure[thing].base64String = (<any>value)._buffer;
            }

            return objectToConfigure;
        }

        // Fills array of root nodes
        private static _FillRootNodes(core: EditorCore, data: Node[], propertyPath: string): void {
            var scene = core.currentScene;
            var nodes: Node[] = scene[propertyPath];

            for (var i = 0; i < nodes.length; i++) {
                if (!nodes[i].parent)
                    data.push(nodes[i]);
            }
        }
    }
}