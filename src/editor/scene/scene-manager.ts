import {
    Scene, Material, BaseTexture, RenderTargetTexture,
    ActionManager, StandardRenderingPipeline, SSAORenderingPipeline,
    SSAO2RenderingPipeline, DefaultRenderingPipeline, IAnimatable,
    ParticleSystem, GlowLayer, HighlightLayer, Animatable, EnvironmentHelper,
    SceneSerializer, InstancedMesh
} from 'babylonjs';

import { IStringDictionary } from '../typings/typings';
import PostProcessesExtension from '../../extensions/post-process/post-processes';

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
}
