import {
    Scene, Tags, Animation, ActionManager, Material, Texture, ShadowGenerator,
    Geometry, Node, Camera, Light, Mesh, ParticleSystem, AbstractMesh, InstancedMesh,
    CannonJSPlugin, PhysicsImpostor, Vector3, EffectLayer, Sound, RenderTargetTexture, ReflectionProbe,
    Color3, Color4, SerializationHelper
} from 'babylonjs';

import Editor from '../editor';

import ProjectSettings from './project-settings';

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
    public static async Import (editor: Editor, project: ProjectRoot): Promise<void> {
        const scene = editor.core.scene;
        
        // Clean project (compatibility)
        this.CleanProject(project);

        // Tools states
        editor.inspector.setToolsStates(project.editionToolsStates);

        // Global Configuration
        if (project.globalConfiguration.serializedCamera)
            editor.createEditorCamera(project.globalConfiguration.serializedCamera);

        if (project.globalConfiguration.environmentTexture)
            scene.environmentTexture = Texture.Parse(project.globalConfiguration.environmentTexture, scene, 'file:');

        if (project.globalConfiguration.imageProcessingConfiguration)
            SerializationHelper.Parse(() => scene.imageProcessingConfiguration, project.globalConfiguration.imageProcessingConfiguration, scene, 'file:');

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
                        break;
                    case 'InstancedMesh':
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
                        break;
                    case 'Mesh':
                        // Geometries
                        if (n.serializationObject.geometries) {
                            n.serializationObject.geometries.vertexData.forEach(v => {
                                Geometry.Parse(v, scene, 'file:');
                            });
                        }
                        // Skeleton
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
                                node = Mesh.Parse(m, scene, 'file:');
                                Tags.AddTagsTo(node, 'added');
                            }

                            // Parent id
                            if (m.parentId)
                                node['_waitingParentId'] = m.parentId;
                        });
                        break;
                    case 'Camera':
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
                        break;
                    default: throw new Error('Cannot parse node named: ' + n.name);
                }
            }
            else {
                node = scene.getNodeByName(n.name);
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

            // Node not found
            if (!node)
                return;

            // Parent id
            if (n.serializationObject.parentId)
                node['_waitingParentId'] = n.serializationObject.parentId;

            // Node animations
            if (n.animations) {
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

        // Particle systems
        project.particleSystems.forEach(ps => {
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
        });

        // Materials
        project.materials.forEach(m => {
            const existing = scene.getMaterialByID(m.serializedValues.id);
            const material = existing ? SerializationHelper.Parse(() => existing, m.serializedValues, scene, 'file:') : Material.Parse(m.serializedValues, scene, 'file:');

            m.meshesNames.forEach(mn => {
                const mesh = scene.getMeshByName(mn);
                if (mesh && !(mesh instanceof InstancedMesh))
                    mesh.material = material;
            });

            // Material has been added
            Tags.AddTagsTo(material, existing ? 'modified' : 'added');
        });

        // Textures
        project.textures.forEach(t => {
            // In case of a clone
            if (t.newInstance) {
                // Already created by materials?
                const existing = Tools.GetTextureByUniqueId(scene, t.serializedValues.uniqueId);
                if (existing) {
                    // Url
                    if (t.serializedValues.url)
                        existing['url'] = t.serializedValues.url;
                    
                    return;
                }
                
                const texture = Texture.Parse(t.serializedValues, scene, 'file:');
                Tags.AddTagsTo(texture, 'added');
            }

            const existing = Tools.GetTextureByUniqueId(scene, t.serializedValues.uniqueId);
            const texture = existing ? SerializationHelper.Parse(() => existing, t.serializedValues, scene, 'file:') : Texture.Parse(t.serializedValues, scene, 'file:');

            Tags.AddTagsTo(texture, existing ? 'modified' : 'added');

            // Url
            if (t.serializedValues.url)
                texture['url'] = t.serializedValues.url;
        });

        // Shadow Generators
        project.shadowGenerators.forEach(sg => {
            const generator = ShadowGenerator.Parse(sg, scene);

            Tags.EnableFor(generator);
            Tags.AddTagsTo(generator, 'added');
        });

        // Sounds
        project.sounds.forEach(s => {
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
        });

        // Actions (scene)
        if (project.actions) {
            ActionManager.Parse(project.actions, null, scene);
            Tags.AddTagsTo(scene.actionManager, 'added');
        }

        // Effect Layers
        project.effectLayers.forEach(el => SceneManager[el.name] = EffectLayer.Parse(el.serializationObject, scene, 'file:'));

        // Render targets
        project.renderTargets.forEach(rt => {
            if (rt.isProbe) {
                const probe = ReflectionProbe.Parse(rt.serializationObject, scene, 'file:');
                Tags.AddTagsTo(probe, 'added');
            }
            else {
                const texture = <RenderTargetTexture> Texture.Parse(rt.serializationObject, scene, 'file:');
                scene.customRenderTargets.push(texture);
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

        // Assets
        editor.assets.clear();

        for (const a in project.assets) {
            const component = editor.assets.components.find(c => c.id === a);
            if (!component)
                continue;

            component.onParseAssets && component.onParseAssets(project.assets[a]);
        }

        // Metadatas
        Extensions.ClearExtensions();

        for (const m in project.customMetadatas) {
            const extension = Extensions.RequestExtension(scene, m);

            if (extension) {
                extension.onLoad(project.customMetadatas[m]);

                if (extension.onGetAssets)
                    editor.assets.addTab(extension);
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
