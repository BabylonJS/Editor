import {
    Scene, Tags, Animation, ActionManager, Material, Texture, ShadowGenerator,
    Geometry, Node, Camera, Light, Mesh, ParticleSystem, AbstractMesh, InstancedMesh,
    CannonJSPlugin, PhysicsImpostor, Vector3, EffectLayer, Sound, RenderTargetTexture, ReflectionProbe,
    Color3, Color4, SerializationHelper, Skeleton, MultiMaterial, CascadedShadowGenerator
} from 'babylonjs';

import Editor from '../editor';

import ProjectExporter from './project-exporter';
import ProjectSettings from './project-settings';
import ProjectHelpers from './project-helpers';

import Tools from '../tools/tools';
import Request from '../tools/request';
import { ProjectRoot } from '../typings/project';

import Extensions from '../../extensions/extensions';
import SceneManager from '../scene/scene-manager';
import SceneImporter from '../scene/scene-importer';

import PostProcessesExtension from '../../extensions/post-process/post-processes';

export default class ProjectImporter {
    /**
     * Imports the project
     * @param editor: the editor reference
     * @param project: the editor project
     */
    public static async Import (editor: Editor, project: ProjectRoot): Promise<string[]> {
        const scene = editor.core.scene;
        const errors: string[] = [];
        
        // Clean project (compatibility)
        this.CleanProject(project);

        // Retrieve nodes
        for (let i = 0; i < project.nodes.length; i++) {
            const node = project.nodes[i];
            if (typeof(node) !== 'string') // Backward compatibility
                continue;
            
            const nodeData = await Tools.LoadFile<string>(`${ProjectExporter.ProjectPath}nodes/${project.nodes[i]}`);
            project.nodes[i] = JSON.parse(nodeData);
        }

         // Retrieve materials
         for (let i = 0; i < project.materials.length; i++) {
            const material = project.materials[i];
            if (typeof(material) !== 'string') // Backward compatibility
                continue;
            
            const materialData = await Tools.LoadFile<string>(`${ProjectExporter.ProjectPath}materials/${project.materials[i]}`);
            project.materials[i] = JSON.parse(materialData);
        }

        // Retrieve textures
        for (let i = 0; i < project.textures.length; i++) {
            const texture = project.textures[i];
            if (typeof(texture) !== 'string') // Backward compatibility
                continue;
            
            const textureData = await Tools.LoadFile<string>(`${ProjectExporter.ProjectPath}textures/${project.textures[i]}`);
            project.textures[i] = JSON.parse(textureData);
        }

        // Tools states
        editor.inspector.setToolsStates(project.editionToolsStates);

        // Global Configuration
        if (project.globalConfiguration.serializedCamera)
            editor.createEditorCamera(project.globalConfiguration.serializedCamera);

        if (project.globalConfiguration.environmentTexture)
            scene.environmentTexture = Texture.Parse(project.globalConfiguration.environmentTexture, scene, 'file:');

        if (project.globalConfiguration.imageProcessingConfiguration) {
            try {
                SerializationHelper.Parse(() => scene.imageProcessingConfiguration, project.globalConfiguration.imageProcessingConfiguration, scene, 'file:');
            } catch (e) {
                errors.push(`Failed to parse image processing configuration: ${e.message}`);
                return errors;
            }
        }

        if (project.globalConfiguration.ambientColor)
            scene.ambientColor = Color3.FromArray(project.globalConfiguration.ambientColor);
            
        if (project.globalConfiguration.clearColor)
            scene.clearColor = Color4.FromArray(project.globalConfiguration.clearColor);

        if (project.globalConfiguration.fog) {
            scene.fogEnabled = project.globalConfiguration.fog.enabled;
            scene.fogStart = project.globalConfiguration.fog.start;
            scene.fogEnd = project.globalConfiguration.fog.end;
            scene.fogDensity = project.globalConfiguration.fog.density;
            scene.fogColor = Color3.FromArray(project.globalConfiguration.fog.color);
            scene.fogMode = project.globalConfiguration.fog.mode;
        }

        ProjectSettings.ProjectExportFormat = project.globalConfiguration.projectFormat || 'babylon';
        ProjectSettings.ExportEulerAngles = project.globalConfiguration.exportEulerAngles || false;
        ProjectSettings.ExportWithES6Support = project.globalConfiguration.exportWithES6Support || false;

        // Physics
        if (!scene.isPhysicsEnabled())
            scene.enablePhysics(scene.gravity, new CannonJSPlugin());

        scene._physicsEngine.setTimeStep(Tools.Epsilon);

        // Nodes
        project.nodes.forEach(n => {
            let node: Node | Scene = null;

            if (n.name === 'Scene') {
                node = scene;
            }
            else if (n.serializationObject) {
                switch (n.type) {
                    case 'Light':
                        try {
                            const existingLight = scene.getLightByID(n.serializationObject.id);
                            if (existingLight) {
                                delete n.serializationObject.metadata;
                                node = SerializationHelper.Parse(() => existingLight, n.serializationObject, scene, 'file:');
                                Tags.AddTagsTo(node, 'modified');
                            }
                            else if (n.added === undefined || n.added) {
                                node = Light.Parse(n.serializationObject, scene);
                                Tags.AddTagsTo(node, 'added');
                            }
                        } catch (e) {
                            errors.push(`Failed to parse light ${n.name}: ${e.message}`);
                            return errors;
                        }
                        break;
                    case 'InstancedMesh':
                        try {
                            const existing = scene.getMeshByID(n.serializationObject.id);
                            if (existing) {
                                node = SerializationHelper.Parse(() => existing, n.serializationObject, scene, 'file:');
                                Tags.AddTagsTo(existing, 'modified');
                            }
                            else if (n.added === undefined || n.added) {
                                const source = <Mesh> scene.getMeshByID(n.serializationObject.sourceMesh);
                                if (!source)
                                    break;
                                
                                node = source.createInstance(n.serializationObject.name);
                                SerializationHelper.Parse(() => node, n.serializationObject, scene, 'file:');
                                Tags.AddTagsTo(node, 'added');
                            }
                        } catch (e) {
                            errors.push(`Failed to parse instanced mesh ${n.name}: ${e.message}`);
                            return errors;
                        }
                        break;
                    case 'Mesh':
                        try {
                            // Geometries
                            if (n.serializationObject.geometries) {
                                n.serializationObject.geometries.vertexData.forEach(v => {
                                    Geometry.Parse(v, scene, 'file:');
                                });
                            }
                            
                            // Skeleton
                            if (n.serializationObject.skeletons) {
                                n.serializationObject.skeletons.forEach(s => Skeleton.Parse(s, scene));
                            }

                            if (n.skeleton) {
                                const existing = scene.getSkeletonById(n.skeleton.serializationObject.id);
                                if (existing) {
                                    Tools.Assign(existing, n.skeleton.serializationObject);
                                    Tags.AddTagsTo(existing, 'modified');
                                }
                            }

                            // Mesh
                            n.serializationObject.meshes.forEach(m => {
                                const existingMesh = scene.getMeshByID(m.id);
                                if (existingMesh) {
                                    delete m.metadata;
                                    node = SerializationHelper.Parse(() => existingMesh, m, scene, 'file:');
                                    Tags.AddTagsTo(node, 'modified');
                                }
                                else if (n.added === undefined || n.added) {
                                    const mesh = node = Mesh.Parse(m, scene, 'file:');
                                    Tags.AddTagsTo(node, 'added');

                                    if (m.skeletonId) {
                                        mesh.skeleton = scene.getLastSkeletonByID(m.skeletonId);
                                        if (m.numBoneInfluencers) {
                                            mesh.numBoneInfluencers = m.numBoneInfluencers;
                                        }
                                    }

                                    // Physics
                                    const impostor = scene.getPhysicsEngine().getImpostorForPhysicsObject(mesh);
                                    if (impostor)
                                        mesh.physicsImpostor = impostor;
                                }

                                // Parent id
                                if (m.parentId)
                                    node['_waitingParentId'] = m.parentId;
                            });
                        } catch (e) {
                            errors.push(`Failed to parse mesh ${n.name}: ${e.message}`);
                            return errors;
                        }
                        break;
                    case 'Camera':
                        try {
                            const existingCamera = scene.getCameraByID(n.serializationObject.id);
                            if (existingCamera) {
                                delete n.serializationObject.metadata;
                                node = SerializationHelper.Parse(() => existingCamera, n.serializationObject, scene, 'file:');
                                Tags.AddTagsTo(node, 'modified');
                            }
                            else if (n.added === undefined || n.added) {
                                node = Camera.Parse(n.serializationObject, scene);
                                Tags.AddTagsTo(node, 'added');
                            }
                        } catch (e) {
                            errors.push(`Failed to parse camera ${n.name}: ${e.message}`);
                            return errors;
                        }
                        break;
                    default: throw new Error('Cannot parse node named: ' + n.name);
                }
            }
            else {
                node = scene.getNodeByID(n.id);
            }

            // Check particle systems
            project.particleSystems.forEach(ps => {
                if (!ps.hasEmitter && n.id && ps.serializationObject && ps.serializationObject.emitterId === n.id) {
                    const emitter = new Mesh(n.name, scene, null, null, true);
                    emitter.id = ps.serializationObject.emitterId;
    
                    // Add tags to emitter
                    Tags.AddTagsTo(emitter, 'added_particlesystem');
                }
            });

            // Node not found or added by the editor.
            if (!node || n.added)
                return;

            // Parent id
            if (n.serializationObject && n.serializationObject.parentId)
                node['_waitingParentId'] = n.serializationObject.parentId;

            // Node animations
            if (n.animations) {
                node.animations = node.animations || [];
                n.animations.forEach(a => {
                    const anim = Animation.Parse(a.serializationObject);
                    Tags.AddTagsTo(anim, 'added');

                    node.animations.push(anim);
                });
            }

            // Node is a Mesh?
            if (node instanceof AbstractMesh) {
                // Actions
                if (n.actions) {
                    ActionManager.Parse(n.actions, node, scene);
                    Tags.AddTagsTo((<AbstractMesh> node).actionManager, 'added');
                }

                // Physics
                if (n.physics) {
                    node.physicsImpostor = new PhysicsImpostor(node, n.physics.physicsImpostor, {
                        mass: n.physics.physicsMass,
                        friction: n.physics.physicsFriction,
                        restitution: n.physics.physicsRestitution
                    }, scene);
                }
            }
        });

        // Assets
        editor.assets.clear();

        for (const a in project.assets) {
            const component = editor.assets.components.find(c => c.id === a);
            if (!component)
                continue;

            try {
                if (component.onParseAssets)
                    await component.onParseAssets(project.assets[a]);
            } catch (e) {
                errors.push(`Failed to parse assets ${component.id}: ${e.message}`);
                return errors;
            }
        }

        // Particle systems
        project.particleSystems.forEach(ps => {
            try {
                const system = ParticleSystem.Parse(ps.serializationObject, scene, 'file:');

                if (ps.hasEmitter)
                    system.emitter = <any> scene.getNodeByID(ps.serializationObject.emitterId);

                if (!ps.hasEmitter && system.emitter && ps.emitterPosition)
                    (<AbstractMesh> system.emitter).position = Vector3.FromArray(ps.emitterPosition);

                // Legacy
                if (ps.serializationObject.base64Texture) {
                    system.particleTexture = Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, scene);
                    system.particleTexture.name = system.particleTexture.name.replace('data:', '');
                }

                // Add tags to particles system
                Tags.AddTagsTo(system, 'added');
            } catch (e) {
                errors.push(`Failed to parse particle system: ${e.message}`);
                return errors;
            }
        });

        // Materials
        project.materials.forEach(m => {
            try {
                const existing = scene.getMaterialByID(m.serializedValues.id);
                const material = existing ? ProjectHelpers.ParseExistingMaterial(existing, m.serializedValues, scene, 'file:') :
                                            m.isMultiMaterial ? new MultiMaterial(m.serializedValues.name, scene) :
                                            Material.Parse(m.serializedValues, scene, 'file:');

                // Finish configure multi-material
                if (material instanceof MultiMaterial) {
                    material.id = m.serializedValues.id;
                    m.serializedValues.materials.forEach((mid) => material.subMaterials.push(scene.getMaterialByID(mid)));
                }

                if (m.meshesIds) {
                    m.meshesIds.forEach(mi => {
                        const mesh = scene.getMeshByID(mi);
                        if (mesh && !(mesh instanceof InstancedMesh))
                            mesh.material = material;
                    });
                }
                else {
                    m.meshesNames.forEach(mn => {
                        const mesh = scene.getMeshByName(mn);
                        if (mesh && !(mesh instanceof InstancedMesh))
                            mesh.material = material;
                    });
                }

                // Material has been added
                Tags.AddTagsTo(material, existing ? 'modified' : 'added');
            } catch (e) {
                errors.push(`Failed to parse material: ${e.message}`);
                return errors;
            }
        });

        // Textures
        project.textures.forEach(t => {
            try {
                // In case of a clone
                if (t.newInstance) {
                    // Already created by materials?
                    const existing = Tools.GetTextureFromSerializedValues(scene, t.serializedValues);
                    if (existing) {
                        // Url
                        if (t.serializedValues.url)
                            existing['url'] = t.serializedValues.url;
                        
                        return;
                    }
                    
                    const texture = Texture.Parse(t.serializedValues, scene, 'file:');
                    Tags.AddTagsTo(texture, 'added');
                }

                const existing = Tools.GetTextureFromSerializedValues(scene, t.serializedValues);
                const texture = existing ? SerializationHelper.Parse(() => existing, t.serializedValues, scene, 'file:') : Texture.Parse(t.serializedValues, scene, 'file:');

                Tags.AddTagsTo(texture, existing ? 'modified' : 'added');

                // Url
                if (t.serializedValues.url)
                    texture['url'] = t.serializedValues.url;
            } catch (e) {
                errors.push(`Failed to parse texture: ${e.message}`);
                return errors;
            }
        });

        // Shadow Generators
        project.shadowGenerators.forEach(sg => {
            try {
                const generator = sg.cascadeBlendPercentage !== undefined ? CascadedShadowGenerator.Parse(sg, scene) : ShadowGenerator.Parse(sg, scene);

                Tags.EnableFor(generator);
                Tags.AddTagsTo(generator, 'added');
            } catch (e) {
                errors.push(`Failed to parse shadow generator: ${e.message}`);
                return errors;
            }
        });

        // Sounds
        project.sounds.forEach(s => {
            try {
                const existing = scene.getSoundByName(s.serializationObject.name);
                if (existing) {
                    // Common
                    s.serializationObject.loop !== undefined && (existing.loop = s.serializationObject.loop);
                    s.serializationObject.volume !== undefined && existing.setVolume(s.serializationObject.volume);
                    s.serializationObject.rolloffFactor !== undefined && (existing.rolloffFactor = s.serializationObject.rolloffFactor);
                    s.serializationObject.playbackRate !== undefined && existing.setPlaybackRate(s.serializationObject.playbackRate);

                    // Spatial
                    if (!s.serializationObject.connectedMeshId) {
                        existing.detachFromMesh();
                        existing.setPosition(Vector3.Zero());
                    } else {
                        const mesh = editor.core.scene.getMeshByID(s.serializationObject.connectedMeshId);
                        if (mesh) {
                            existing.attachToMesh(mesh);
                            s.serializationObject.position !== undefined && existing.setPosition(Vector3.FromArray(s.serializationObject.position));
                        }
                    }

                    Tags.AddTagsTo(existing, 'modified');
                } else {
                    const sound = Sound.Parse(s.serializationObject, scene, 'file:');
                    Tags.AddTagsTo(sound, 'added');
                }
            } catch (e) {
                errors.push(`Failed to parse sound ${s.name}: ${e.message}`);
                return errors;
            }
        });

        // Actions (scene)
        if (project.actions) {
            ActionManager.Parse(project.actions, null, scene);
            Tags.AddTagsTo(scene.actionManager, 'added');
        }

        // Effect Layers
        try {
            project.effectLayers.forEach(el => SceneManager[el.name] = EffectLayer.Parse(el.serializationObject, scene, 'file:'));
        } catch (e) {
            errors.push(`Failed to parse effect layer: ${e.message}`);
            return errors;
        }

        // Render targets
        project.renderTargets.forEach(rt => {
            try {
                if (rt.isProbe) {
                    const probe = ReflectionProbe.Parse(rt.serializationObject, scene, 'file:');
                    Tags.AddTagsTo(probe, 'added');
                }
                else {
                    const texture = <RenderTargetTexture> Texture.Parse(rt.serializationObject, scene, 'file:');
                    scene.customRenderTargets.push(texture);
                }
            } catch (e) {
                errors.push(`Failed to parse render target: ${e.message}`);
                return errors;
            }
        });

        // Environment
        if (project.environmentHelper) {
            SceneManager.EnvironmentHelper = editor.core.scene.createDefaultEnvironment({
                groundColor: new Color3().copyFrom(project.environmentHelper.groundColor),
                skyboxColor: new Color3().copyFrom(project.environmentHelper.skyboxColor),
                enableGroundMirror: project.environmentHelper.enableGroundMirror
            });
        }

        // Metadatas
        Extensions.ClearExtensions();

        for (const m in project.customMetadatas) {
            try {
                const extension = Extensions.RequestExtension(scene, m);

                if (extension) {
                    extension.onLoad(project.customMetadatas[m]);

                    if (extension.onGetAssets)
                        editor.assets.addTab(extension);
                }
            } catch (e) {
                errors.push(`Failed to load extension ${m}: ${e.message}`);
                return errors;
            }
        }

        // Notes
        if (project.customMetadatas.notes) {
            editor.core.scene.metadata = editor.core.scene.metadata || { };
            editor.core.scene.metadata.notes = project.customMetadatas.notes;
            editor.addEditPanelPlugin('notes', true);
        }

        // Post-processes
        const ppExtension = <PostProcessesExtension> Extensions.Instances['PostProcess'];
        if (ppExtension) {
            SceneManager.DefaultRenderingPipeline = ppExtension.default;
            SceneManager.StandardRenderingPipeline = ppExtension.standard;
            SceneManager.SSAO2RenderingPipeline = ppExtension.ssao2;
        }

        // Refresh assets
        editor.assets.refresh();

        // Waiting parent ids
        editor.core.scene.meshes.forEach(m => {
            if (m._waitingParentId) {
                m.parent = editor.core.scene.getNodeByID(m._waitingParentId);
                m._waitingParentId = undefined;
            }
        });

        editor.core.scene.lights.forEach(l => {
            if (l._waitingParentId) {
                l.parent = editor.core.scene.getNodeByID(l._waitingParentId);
                l._waitingParentId = undefined;
            }
        });

        editor.core.scene.cameras.forEach(c => {
            if (c._waitingParentId) {
                c.parent = editor.core.scene.getNodeByID(c._waitingParentId);
                c._waitingParentId = undefined;
            }
        });

        // Apply project settings
        ProjectSettings.ApplySettings(editor);

        return errors;
    }

    /**
    * Cleans an editor project
    */
    public static CleanProject (project: ProjectRoot): void {
        project.renderTargets = project.renderTargets || [];
        project.sounds = project.sounds || [];
        project.customMetadatas = project.customMetadatas || {};
        project.physicsEnabled = project.physicsEnabled || false;
        project.effectLayers = project.effectLayers || [];
        project.globalConfiguration = project.globalConfiguration || { };
        project.assets = project.assets || { };
        project.textures = project.textures || [];
        project.removedObjects = project.removedObjects || { };
        project.editionToolsStates = project.editionToolsStates || [];

        // Importer errors
        project.effectLayers.forEach(el => {
            delete el.serializationObject.renderingGroupId;
        });
    }

    /**
     * Imports files + project
     * @param editor the editor reference
     */
    public static async ImportProject (editor: Editor): Promise<boolean> {
        const files = await Tools.OpenFileDialog();
        if (files.length === 1 && Tools.GetFileExtension(files[0].name) === 'editorproject' && Tools.IsElectron()) {
            await Request.Post('/openedFile', JSON.stringify({ value: files[0]['path'].replace(/\\/g, '/') }));
            return await SceneImporter.LoadProjectFromFile(
                editor,
                (<any> files[0]).path,
                <ProjectRoot> JSON.parse(await Tools.ReadFileAsText(files[0]))
            );
        }

        editor.filesInput.loadFiles({
            target: {
                files: files
            }
        });

        return false;
    }
}
