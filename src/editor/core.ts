import { Engine, Scene } from 'babylonjs';

export default class Core {
    // Public members
    public engine: Engine;
    public scenes: Scene[] = [];
    public scene: Scene;

    public updates: { onPreUpdate?(): void, onPostUpdate?(): void }[] = [];

    /**
     * Constructor
     */
    constructor()
    { }

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
