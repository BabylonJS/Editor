import {
    Scene, Tags,
    Animation, ActionManager,
    Material, Texture,
    ShadowGenerator,
    Geometry,
    Node, Camera, Light, Mesh, ParticleSystem, AbstractMesh,
    CannonJSPlugin, PhysicsImpostor,
    Vector3
} from 'babylonjs';

import * as Export from '../typings/project';
import Editor from '../editor';

import Tools from '../tools/tools';

import Extensions from '../../extensions/extensions';

export default class SceneImporter {
    /**
     * Imports the project
     * @param editor: the editor reference
     * @param project: the editor project
     */
    public static async Import (editor: Editor, project: Export.ProjectRoot): Promise<void> {
        const scene = editor.core.scene;
        
        // Clean project (compatibility)
        this.CleanProject(project);

        // Physics
        if (!scene.isPhysicsEnabled())
            scene.enablePhysics(scene.gravity, new CannonJSPlugin());

        // Nodes
        project.nodes.forEach(n => {
            let node: Node | Scene = null;

            if (n.name === 'Scene') {
                node = scene;
            }
            else if (n.serializationObject) {
                switch (n.type) {
                    case 'Light': node = Light.Parse(n.serializationObject, scene); break;
                    case 'Mesh':
                        // Geometries
                        n.serializationObject.geometries.vertexData.forEach(v => {
                            Geometry.Parse(v, scene, 'file:');
                        });
                        // Mesh
                        n.serializationObject.meshes.forEach(m => {
                            node = Mesh.Parse(m, scene, 'file:');
                        });
                        break;
                    case 'Camera': node = Camera.Parse(n.serializationObject, scene); break;
                    default: throw new Error('Cannot parse node named: ' + n.name);
                }

                // Node was added
                Tags.AddTagsTo(node, 'added');
            }
            else {
                node = scene.getNodeByName(n.name);
            }

            // Check particle systems
            if (!node) {
                project.particleSystems.forEach(ps => {
                    if (ps.serializationObject.emitterId !== n.id)
                        return;
                    
                    const system = ParticleSystem.Parse(ps.serializationObject, scene, 'file:');
                    if (!ps.hasEmitter) {
                        const emitter = new Mesh(n.id, scene, null, null, true);
                        emitter.id = ps.serializationObject.emitterId;
                        emitter.position = Vector3.FromArray(ps.emitterPosition);
    
                        system.emitter = emitter;
    
                        // Add tags to emitter
                        Tags.AddTagsTo(emitter, 'added_particlesystem');
                    }

                    // Legacy
                    if (ps.serializationObject.base64Texture) {
                        system.particleTexture = Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, scene);
                        system.particleTexture.name = system.particleTexture.name.replace('data:', '');
                    }

                    // Add tags to particles system
                    Tags.AddTagsTo(system, 'added');
                });
            }

            // Node not found
            if (!node)
                return;

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

        // Materials
        project.materials.forEach(m => {
            const material = Material.Parse(m.serializedValues, scene, 'file:');
            m.meshesNames.forEach(mn => {
                const mesh = scene.getMeshByName(mn);
                if (mesh)
                    mesh.material = material;
            });

            // Material has been added
            Tags.AddTagsTo(material, 'added');
        });

        // Shadow Generators
        project.shadowGenerators.forEach(sg => {
            const generator = ShadowGenerator.Parse(sg, scene);

            Tags.EnableFor(generator);
            Tags.AddTagsTo(generator, 'added');
        });

        // Actions (scene)
        if (project.actions) {
            ActionManager.Parse(project.actions, null, scene);
            Tags.AddTagsTo(scene.actionManager, 'added');
        }

        // Metadatas
        for (const m in project.customMetadatas) {
            const extension = Extensions.RequestExtension(scene, m);

            if (extension)
                extension.onLoad(project.customMetadatas[m]);
        }

        // Finish
        scene.materials.forEach(m => m['maxSimultaneousLights'] = scene.lights.length * 2);
    }

    /**
    * Cleans an editor project
    */
    public static CleanProject (project: Export.ProjectRoot): void {
        project.renderTargets = project.renderTargets || [];
        project.sounds = project.sounds || [];
        project.customMetadatas = project.customMetadatas || {};
        project.physicsEnabled = project.physicsEnabled || false;
        //project.globalConfiguration.settings = project.globalConfiguration.settings || SceneFactory.Settings;
    }

    /**
     * Imports files + project
     */
    public static ImportProject (editor: Editor): void {
        Tools.OpenFileDialog((files) => {
            editor.filesInput.loadFiles({
                target: {
                    files: files
                }
            });
        });
    }
}
