import {
    Engine,
    Scene, SceneLoader
} from 'babylonjs';

export default class Game {
    // Public members
    public engine: Engine;
    public canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('renderCanvas');
    
    public scene: Scene = null;

    /**
     * Constructor
     */
    constructor () {
        this.engine = new Engine(this.canvas, true, {
            // Options
        });
    }

    /**
     * Runs the game
     */
    public run (): void {
        // Load Scene
        SceneLoader.Load('./Scene/', 'scene.babylon', this.engine, (scene: Scene) => {
            this.scene = scene;

            // Attach camera
            this.scene.activeCamera.attachControl(this.canvas, true);

            // Run render loop
            this.engine.runRenderLoop(() => {
                this.scene.render();
            });
        });
    }
}