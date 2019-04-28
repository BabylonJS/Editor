import {
    Tools as BabylonTools,
    Scene, Material, BaseTexture, RenderTargetTexture,
    ActionManager, StandardRenderingPipeline, SSAORenderingPipeline,
    SSAO2RenderingPipeline, DefaultRenderingPipeline, IAnimatable,
    ParticleSystem, GlowLayer, HighlightLayer, Animatable, EnvironmentHelper,
    SceneSerializer, InstancedMesh, Node, Sound, Mesh, SerializationHelper,
    AbstractMesh
} from 'babylonjs';
import * as BABYLON from 'babylonjs';

import Editor from '../editor';
import { IStringDictionary } from '../typings/typings';
import PostProcessesExtension from '../../extensions/post-process/post-processes';

import Picker from '../gui/picker';
import Window from '../gui/window';

export interface RemovedObject {
    reference?: Node | Sound;
    type?: string;
    serializationObject: any;
}

export default class SceneManager {
    // Public members
    public static ActionManagers: IStringDictionary<ActionManager> = { };
    public static StandardRenderingPipeline: StandardRenderingPipeline = null;
    public static DefaultRenderingPipeline: DefaultRenderingPipeline = null;
    public static SSAORenderingPipeline: SSAORenderingPipeline = null;
    public static SSAO2RenderingPipeline: SSAO2RenderingPipeline = null;

    public static GlowLayer: GlowLayer = null;
    public static HighLightLayer: HighlightLayer = null;

    public static EnvironmentHelper: EnvironmentHelper = null;

    public static PostProcessExtension: PostProcessesExtension = null;

    public static RemovedObjects: IStringDictionary<RemovedObject> = { };

    /**
     * Clears the scene manager
     */
    public static Clear (): void {
        this.ActionManagers = { };
        
        this.PostProcessExtension = null;
        
        this.GlowLayer = null;
        this.HighLightLayer = null;

        this.StandardRenderingPipeline = null;
        this.DefaultRenderingPipeline = null;
        this.SSAO2RenderingPipeline = null;
        this.SSAORenderingPipeline = null;

        this.EnvironmentHelper = null;
        this.RemovedObjects = { };
    }

    /**
     * Toggles all interaction events to disable but keep
     * references like Action Manager references etc.
     * @param scene the scene to toggle
     */
    public static Toggle (scene: Scene): void {
        scene.meshes.forEach(m => {
            const savedActionManager = this.ActionManagers[m.id] || null;
            const currentActionManager = m.actionManager;

            // TODO: wait for babylonjs to export AbstractActionManager
            this.ActionManagers[m.id] = <any> currentActionManager;
            m.actionManager = savedActionManager;
        });
    }

    /**
     * Saves the original objects coming from the scene
     * @param scene the scene containing the original objects
     */
    public static SaveOriginalObjects (scene: Scene): void {
        const set = (orig, obj) => {
            orig.metadata = orig.metadata || { };
            orig.metadata.original = obj;
        };
        scene.meshes.forEach(m => {
            // Instance?
            if (m instanceof InstancedMesh)
                return set(m, m.serialize());
            
            // Mesh
            const s = SceneSerializer.SerializeMesh(m, false, false);
            delete s.geometries;
            delete s.materials;
            delete s.skeletons;
            delete s.multiMaterials;
            set(m, s.meshes[0]);
        });
        scene.skeletons.forEach(s => set(s, s.serialize()));
        scene.materials.forEach(m => set(m, m.serialize()));
        scene.lights.forEach(l => set(l, l.serialize()));
        scene.cameras.forEach(c => set(c, c.serialize()));
        scene.textures.forEach(t => set(t, t.serialize()));
        scene.transformNodes.forEach(t => set(t, t.serialize()));
        scene.soundTracks && scene.soundTracks.forEach(st => {
           st.soundCollection.forEach(s => set(s, s.serialize()));
        });
    }

    /**
     * Returns the animatable objects
     * @param scene the scene containing animatables
     */
    public static GetAnimatables (scene: Scene): IAnimatable[] {
        const animatables: IAnimatable[] = [scene];

        if (this.StandardRenderingPipeline) animatables.push(this.StandardRenderingPipeline);

        scene.meshes.forEach(m => animatables.push(m));
        scene.lights.forEach(l => animatables.push(l));
        scene.cameras.forEach(c => animatables.push(c));
        scene.particleSystems.forEach(ps => animatables.push(<ParticleSystem> ps));

        return animatables;
    }

    /**
     * Returns the animation frame bounds (min frame, max frame)
     * @param animatables the animtables to check
     */
    public static GetAnimationFrameBounds (animatables: IAnimatable[]): { min: number, max: number } {
        const bounds = {
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE
        };

        animatables.forEach(a => {
            a.animations.forEach(a => {
                const keys = a.getKeys();
                
                keys.forEach(k => {
                    if (k.frame < bounds.min)
                        bounds.min = k.frame;
                    if (k.frame > bounds.max)
                        bounds.max = k.frame;
                });
            });
        });

        return bounds;
    }

    /**
     * Plays all the animtables
     * @param scene: the scene containing the animatables
     * @param animatables the animatables to play
     */
    public static PlayAllAnimatables (scene: Scene, animatables: IAnimatable[]): void {
        const bounds = SceneManager.GetAnimationFrameBounds(animatables);
        animatables.forEach(a => scene.beginAnimation(a, bounds.min, bounds.max, false, 1.0, null, null, true));
    }

    /**
     * Stops all the animatables
     * @param scene the scene containing the animatables
     * @param animatables the animatable objects
     */
    public static StopAllAnimatables (scene: Scene, animatables: IAnimatable[]): void {
        const bounds = SceneManager.GetAnimationFrameBounds(animatables);
        animatables.forEach(a => {
            let animatable = scene.getAnimatableByTarget(a);
            if (!animatable)
                animatable = new Animatable(scene, a, bounds.min, bounds.max, false, 1.0);
            
            animatable.appendAnimations(a, a.animations);
            animatable.stop();
            animatable.goToFrame(bounds.min);
            
        });
    }

    /**
     * Clears all the unused materials from the scene
     * @param scene: the scene containing the materials
     */
    public static CleanUnusedMaterials (scene: Scene): number {
        let count = 0;

        const used: Material[] = [];
        scene.meshes.forEach(m => m.material && used.indexOf(m.material) === -1 && used.push(m.material));

        for (let i = 0; i < scene.materials.length; i++) {
            const m = scene.materials[i];
            if (m.name === 'colorShader')
                continue;

            if (used.indexOf(m) === -1) {
                m.dispose(true, false);
                count++;
                i--;
            }
        }
        
        return count;
    }

    /**
     * Clears all the unused textures from the scene
     * @param scene the scene containing the textures
     */
    public static CleanUnusedTextures (scene: Scene): number {
        let count = 0;

        const used: BaseTexture[] = [];
        scene.materials
        .concat(<any> scene.particleSystems)
        .concat(<any> scene.postProcesses).forEach(m => {
            for (const thing in m) {
                const value = m[thing];

                if (value instanceof BaseTexture && used.indexOf(m[thing]) === -1)
                    used.push(m[thing]);
            }
        });
        
        for (let i = 0; i < scene.textures.length; i++) {
            const t = scene.textures[i];

            if (!(t instanceof RenderTargetTexture) && used.indexOf(t) === -1) {
                t.dispose();
                count++;
                i--;
            }
        }

        return count;
    }

    /**
     * Saves the removed objects references
     * @param scene the scene containing the objects to remove
     * @param removedObjects the removed objects references
     */
    public static ApplyRemovedObjects (scene: Scene, removedObjects: IStringDictionary<any>): void {
        // Save
        this.RemovedObjects = removedObjects;

        // Apply
        for (const id in this.RemovedObjects) {
            // Value
            const value = this.RemovedObjects[id];

            // Node
            const n = scene.getNodeByID(id);
            if (n) {
                value.reference = n;
                n.dispose(true, false);
                continue;
            }

            // Sound
            scene.soundTracks && scene.soundTracks.forEach(st => {
                const s = st.soundCollection.find(s => s.name === id);
                if (!s)
                    return;

                s.stop();
                value.reference = s;
                s.dispose();
            });
        }
    }

    /**
     * Draws a dialog to restore removed objects
     * @param editor the editor reference
     */
    public static RestoreRemovedObjects (editor: Editor): void {
        const keys = Object.keys(this.RemovedObjects);
        
        const picker = new Picker('Restore Removed Objects...');
        picker.addItems(keys.map(i => ({ name: this.RemovedObjects[i].serializationObject.name })));
        picker.open(items => {
            const errors: string[] = [];

            items.forEach(i => {
                const value = this.RemovedObjects[keys[i.id]];
                const parent = value.reference instanceof Node ? value.reference.parent : value.reference['_connectedTransformNode'];
                if (parent && !editor.core.scene.getNodeByID(parent.id))
                    return errors.push(`Can't restore node "${i.name}": the original parent does not exist in scene ("${parent.name}")`);
                
                let result: Node | Sound = null;

                // Instanced mesh
                if (value.reference instanceof InstancedMesh) {
                    const source = <Mesh> editor.core.scene.getMeshByID(value.serializationObject.sourceMesh);
                    if (!source) {
                        return errors.push(`Can't restore instanced mesh "${i.name}". Source mesh wasn't found.`);
                    }
                    
                    result = source.createInstance(value.serializationObject.name);
                    SerializationHelper.Parse(() => result, value.serializationObject, editor.core.scene, 'file:');
                }
                // Other
                else {
                    const ctor = BABYLON[value.type];
                    if (!ctor || !ctor.Parse)
                        return errors.push(`Can't restore node "${i.name}": object can't be re-created as the .Parse function does not exist`);

                    result = ctor.Parse(value.serializationObject, editor.core.scene, 'file:');
                }

                if (result instanceof Node) {
                    if (result instanceof AbstractMesh)
                        editor.scenePicker.configureMesh(result);
                    
                    result.parent = parent;
                    editor.graph.add({
                        data: result,
                        id: result.id,
                        img: editor.graph.getIcon(result),
                        text: result.name,
                    }, result.parent ? result.parent.id : editor.graph.root);
                }
                else if (result instanceof Sound) {
                    // Parent
                    if (parent)
                        result.attachToMesh(parent);
                    
                    // Add
                    result['id'] = result['id'] || BabylonTools.RandomId();
                    editor.graph.add({
                        data: result,
                        id: result['id'],
                        img: editor.graph.getIcon(result),
                        text: result.name,
                    }, result.spatialSound && result['_connectedTransformNode'] ? result['_connectedTransformNode'].id : editor.graph.root);
                }

                // Finalize
                result['metadata'] = result['metadata'] || { };
                result['metadata'].original = value.serializationObject;
                delete this.RemovedObjects[keys[i.id]];
                editor.graph.configure();
            });

            if (errors.length > 0) {
                setTimeout(() => {
                    Window.CreateAlert(errors.join('\n'), 'Errors found');
                }, 1000);
            }
        });
    }
}
