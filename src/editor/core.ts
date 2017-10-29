import { Engine, Scene, Observable } from 'babylonjs';

export default class Core {
    // Public members
    public engine: Engine;
    public scenes: Scene[] = [];
    public scene: Scene;

    public updates: { onPreUpdate?(): void, onPostUpdate?(): void }[] = [];

    public onSelectObject: Observable<any> = new Observable<any>();
    public onResize: Observable<{ }> = new Observable<{ }>();

    /**
     * Constructor
     */
    constructor()
    { }

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
