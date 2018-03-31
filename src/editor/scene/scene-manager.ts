import {
    Scene, Material, StandardMaterial, BaseTexture, RenderTargetTexture,
    ActionManager,
    StandardRenderingPipeline, SSAORenderingPipeline, SSAO2RenderingPipeline,
    IAnimatable,
    ParticleSystem,
    GlowLayer,
    HighlightLayer
} from 'babylonjs';

import { IStringDictionary } from '../typings/typings';
import PostProcessesExtension from '../../extensions/post-process/post-processes';

export default class SceneManager {
    // Public members
    public static ActionManagers: IStringDictionary<ActionManager> = { };
    public static StandardRenderingPipeline: StandardRenderingPipeline = null;
    public static SSAORenderingPipeline: SSAORenderingPipeline = null;
    public static SSAO2RenderingPipeline: SSAO2RenderingPipeline = null;

    public static GlowLayer: GlowLayer = null;
    public static HighLightLayer: HighlightLayer = null;

    public static PostProcessExtension: PostProcessesExtension = null;

    /**
     * Clears the scene manager
     */
    public static Clear (): void {
        this.ActionManagers = { };
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

            this.ActionManagers[m.id] = currentActionManager;
            m.actionManager = savedActionManager;
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
     * @param animatables the animatables to play
     */
    public static PlayAllAnimatables (scene: Scene, animatables: IAnimatable[]): void {
        const bounds = SceneManager.GetAnimationFrameBounds(animatables);
        animatables.forEach(a => scene.beginAnimation(a, bounds.min, bounds.max, false, 1.0));
    }

    /**
     * Clears all the unused materials from the scene
     * @param scene: the scene containing the materials
     */
    public static CleanUnusedMaterials (scene: Scene): number {
        let count = 0;

        const used: Material[] = [];
        scene.meshes.forEach(m => m.material && used.indexOf(m.material) === -1 && used.push(m.material));

        scene.materials.forEach(m => {
            if (m instanceof StandardMaterial && used.indexOf(m) === -1) {
                m.dispose(true, false);
                count++;
            }
        });
        
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
        scene.textures.forEach(t => {
            if (!(t instanceof RenderTargetTexture) && used.indexOf(t) === -1) {
                t.dispose();
                count++;
            }
        });

        return count;
    }
}
