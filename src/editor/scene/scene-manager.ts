import {
    Scene,
    ActionManager,
    StandardRenderingPipeline, SSAORenderingPipeline, SSAO2RenderingPipeline
} from 'babylonjs';

import { IStringDictionary } from '../typings/typings';
import PostProcessesExtension from '../../extensions/post-process/post-processes';

export default class SceneManager {
    // Public members
    public static ActionManagers: IStringDictionary<ActionManager> = { };
    public static StandardRenderingPipeline: StandardRenderingPipeline = null;
    public static SSAORenderingPipeline: SSAORenderingPipeline = null;
    public static SSAO2RenderingPipeline: SSAO2RenderingPipeline = null;

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
}
