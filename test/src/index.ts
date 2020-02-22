import { Engine, Scene, SceneLoader } from "@babylonjs/core";
import "@babylonjs/materials";

import { runScene } from "./scenes/meshes";

export class Game {
    /**
     * Defines the engine used to draw the game using Babylon.JS and WebGL
     */
    public engine: Engine;
    /**
     * Defines the scene used to store and draw elements in the canvas.
     */
    public scene: Scene;

    /**
     * Constructor.
     */
    public constructor() {
        this.engine = new Engine(document.getElementById("renderCanvas") as HTMLCanvasElement, true);
        this.scene = new Scene(this.engine);

        this._bindEvents();
        this._load();
    }

    /**
     * Loads the first scene.
     */
    private _load(): void {
        SceneLoader.Append("./scenes/meshes/", "scene.babylon", this.scene, () => {
            this.scene.executeWhenReady(() => {
                // Attach camera.
                if (!this.scene.activeCamera) {
                    throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
                }
                this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), false);

                // Run the scene to attach scripts etc.
                runScene(this.scene);

                // Render.
                this.engine.runRenderLoop(() => this.scene.render());
            });
        }, undefined, (_, message) => {
            console.error(message);
        }, "babylon");
    }

    /**
     * Binds the required events for a full experience.
     */
    private _bindEvents(): void {
        window.addEventListener("resize", () => this.engine.resize());
    }
}
