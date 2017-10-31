import { Scene, ActionManager } from 'babylonjs';
import { IStringDictionary } from '../typings/typings';

export default class SceneManager {
    // Public members
    public static ActionManagers: IStringDictionary<ActionManager> = { };

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
