import {
    Engine,
    Scene, SceneLoader,
    Tools
} from 'babylonjs';

import { Extensions } from 'babylonjs-editor-extensions';

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
        SceneLoader.Load('./scene/', 'scene.{{scene_format}}', this.engine, (scene: Scene) => {
            this.scene = scene;

            // Attach camera
            this.scene.activeCamera.attachControl(this.canvas, true);

            // Load extensions
            Tools.LoadFile('./scene/project.editorproject', (data: string) => {
                Extensions.ApplyExtensions(this.scene, JSON.parse(data));
                
                // Run render loop
                this.engine.runRenderLoop(() => {
                    this.scene.render();
                });
            });
        });
    }
}