import { Engine, Scene, Observable } from 'babylonjs';
import { AdvancedDynamicTexture } from 'babylonjs-gui';

export interface IUpdatable {
    /**
     * On before render the scene
     */
    onPreUpdate?(): void;
    /**
     * On after render the scene
     */
    onPostUpdate?(): void;
}

export default class Core {
    // Public members
    public engine: Engine;

    public scenes: Scene[] = [];
    public scene: Scene;

    public uiTextures: AdvancedDynamicTexture[] = [];

    public currentSelectedObject: any = null;

    public updates: IUpdatable[] = [];

    public onSelectObject: Observable<any> = new Observable<any>();
    public onResize: Observable<{ }> = new Observable<{ }>();

    /**
     * Constructor
     */
    constructor() {
        // Register on events
        this.onSelectObject.add((object) => this.currentSelectedObject = object);
    }

    /**
     * Removes the given scene from the registered scenes
     * @param scene: the scene reference to remove
     */
    public removeScene (scene: Scene): boolean {
        const index = this.scenes.findIndex(s => s === scene);
        if (index !== -1) {
            scene.dispose();
            this.scenes.splice(index, 1);
            return true;
        }
        
        return false;
    }

    /**
     * Removes the given UI (advanced texture) from the registered UIS
     * @param ui: the ui advanced texture reference to remove
     */
    public removeUI (ui: AdvancedDynamicTexture): boolean {
        const index = this.uiTextures.findIndex(u => u === ui);
        if (index !== -1) {
            ui.dispose();
            this.scenes.splice(index, 1);
            return true;
        }
        
        return false;
    }

    /**
     * Updates the rendering + notify updaters
     */
    public update(): void {
        // On pre update
        this.updates.forEach(u => u.onPreUpdate && u.onPreUpdate());

        // Update (render) scenes
        this.scenes.forEach(s => s.render());

        // On post update
        this.updates.forEach(u => u.onPostUpdate && u.onPostUpdate());
    }
}
