module BABYLON.EDITOR {
    export class ProjectExporter {
        // Public members
        // None

        // Private members
        // None

        // Exports the project
        public static ExportProject(core: EditorCore, requestMaterials: boolean = false): string {
            SceneSerializer.ClearCache();

            if (!core.isPlaying)
                SceneManager.SwitchActionManager();
            
            var project: INTERNAL.IProjectRoot = {
                globalConfiguration: this._SerializeGlobalAnimations(),
                materials: [],
                particleSystems: [],
                nodes: [],
                shadowGenerators: [],
                postProcesses: this._SerializePostProcesses(),
                lensFlares: this._SerializeLensFlares(core),
                renderTargets: this._SerializeRenderTargets(core),
                actions: this._SerializeActionManager(core.currentScene),
                physicsEnabled: core.currentScene.isPhysicsEnabled(),
                sounds: this._SerializeSounds(core),

                requestedMaterials: requestMaterials ? [] : undefined,
                customMetadatas: this._SerializeCustomMetadatas(core)
            };

            this._TraverseNodes(core, null, project);

            if (!core.isPlaying)
                SceneManager.SwitchActionManager();

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
        
        // Serialize sounds
        private static _SerializeSounds(core: EditorCore): INTERNAL.ISound[] {
            var config: INTERNAL.ISound[] = [];
            var index = 0;
            
            for (index = 0; index < core.currentScene.soundTracks[0].soundCollection.length; index++) {
                var sound = core.currentScene.soundTracks[0].soundCollection[index];
                
                if (!Tags.HasTags(sound) || !Tags.MatchesQuery(sound, "added"))
                    continue;

                config.push({
                    name: sound.name,
                    serializationObject: sound.serialize()
                });
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

            // Mirror textures
            for (index = 0; index < core.currentScene.textures.length; index++) {
                var tex = core.currentScene.textures[index];
                
                if (!Tags.HasTags(tex) || !Tags.MatchesQuery(tex, "added"))
                    continue;

                if (tex instanceof MirrorTexture) {
                    var obj: INTERNAL.IRenderTarget = {
                        isProbe: false,
                        serializationObject: tex.serialize()
                    };

                    config.push(obj);
                }
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

            if (SceneFactory.StandardPipeline) {
                config.push({
                    serializationObject: SceneFactory.StandardPipeline.serialize()
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
                            if (ps instanceof ParticleSystem) {
                                psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                                psObj.serializationObject.base64Texture = (<any>ps.particleTexture)._buffer;
                            }
                            
                            delete psObj.serializationObject.textureName;

                            project.particleSystems.push(psObj);
                        }
                    }

                    // Check materials
                    if (node instanceof AbstractMesh && node.material && (!(node.material instanceof StandardMaterial) || Tags.MatchesQuery(node.material, "added"))) {
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
                            : node instanceof InstancedMesh ? "InstancedMesh"
                            : "Mesh",
                        animations: []
                    };
                    var addNodeObj = false;

                    if (Tags.HasTags(node)) { // Maybe modified by the editor
                        if (Tags.MatchesQuery(node, "added_particlesystem"))
                            addNodeObj = true;

                        if (Tags.MatchesQuery(node, "added")) {
                            addNodeObj = true;

                            if (node instanceof InstancedMesh) {
                                var serializedInstances = SceneSerializer.SerializeMesh(node.sourceMesh, false, false).meshes[0].instances;
                                var sourceMesh = node.sourceMesh;

                                for (var j = 0; j < serializedInstances.length; j++) {
                                    if (serializedInstances[j].name === node.name) {
                                        nodeObj.serializationObject = serializedInstances[j];
                                        nodeObj.serializationObject.sourceMesh = sourceMesh.id;

                                        break;
                                    }
                                }
                            }
                            else if (node instanceof Mesh) {
                                nodeObj.serializationObject = SceneSerializer.SerializeMesh(node, false, false);

                                for (var meshIndex = 0; meshIndex < nodeObj.serializationObject.meshes.length; meshIndex++) {
                                    delete nodeObj.serializationObject.meshes[meshIndex].animations;
                                    delete nodeObj.serializationObject.meshes[meshIndex].actions;
                                }
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
                            /*
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
                            */

                            // Add
                            nodeObj.animations.push(animObj);
                        }
                    }

                    // Actions
                    if (node instanceof AbstractMesh) {
                        // Check physics
                        var physicsImpostor = node.getPhysicsImpostor();

                        if (physicsImpostor && Tags.HasTags(physicsImpostor) && Tags.MatchesQuery(physicsImpostor, "added")) {
                            addNodeObj = true;

                            nodeObj.physics = {
                                physicsMass: node.physicsImpostor.getParam("mass"),
                                physicsFriction: node.physicsImpostor.getParam("friction"),
                                physicsRestitution: node.physicsImpostor.getParam("restitution"),
                                physicsImpostor: node.physicsImpostor.type
                            }
                        }

                        // Actions
                        nodeObj.actions = this._SerializeActionManager(node);
                        if (nodeObj.actions)
                            addNodeObj = true;
                    }

                    // Add
                    if (addNodeObj) {
                        project.nodes.push(nodeObj);
                    }
                }

                if (node instanceof Node) {
                    /*
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        this._TraverseNodes(core, node.getDescendants()[i], project);
                    }
                    */
                }
            }
        }

        // Serializes action manager of an object or scene
        // Returns null if does not exists or not added from the editor
        private static _SerializeActionManager(object: AbstractMesh | Scene): any {
            if (object.actionManager && Tags.HasTags(object.actionManager) && Tags.MatchesQuery(object.actionManager, "added")) {
                return object.actionManager.serialize(object instanceof Scene ? "Scene" : (<AbstractMesh>object).name);
            }

            return null;
        }

        // Serializes the custom metadatas, largely used by plugins like post-process builder
        // plugin.
        private static _SerializeCustomMetadatas(core: EditorCore): IStringDictionary<any> {
            var dict: IStringDictionary<any> = {};

            for (var thing in SceneManager._CustomMetadatas) {
                dict[thing] = SceneManager._CustomMetadatas[thing];

                for (var i = 0; i < EXTENSIONS.EditorExtension._Extensions.length; i++) {
                    var extension = EXTENSIONS.EditorExtension._Extensions[i];

                    if (!extension.prototype.onSerialize)
                        continue;
                    
                    var instance = new extension(core.currentScene);
                    if (instance.extensionKey !== thing)
                        continue;

                    instance.onSerialize(dict[thing]);
                }
            }

            return dict;
        }

        // Setups the requested materials (to be uploaded in template or release)
        private static _RequestMaterial(core: EditorCore, project: INTERNAL.IProjectRoot, material: Material): void {
            if (!material || material instanceof StandardMaterial || material instanceof MultiMaterial || material instanceof PBRMaterial || !project.requestedMaterials)
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
                //if (!nodes[i].parent)
                    data.push(nodes[i]);
            }
        }
    }
}