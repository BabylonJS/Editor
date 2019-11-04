import "babylonjs-materials"; //Import this to use the materials library (water, smoke etc)
import "babylonjs-procedural-textures"; //Import this to use procecural textures
import "babylonjs-loaders"; //this is for when you export in a format other than .babylon
import "babylonjs-gui"; //this allows you to use the BabylonJsGui

import {
  CannonJSPlugin,
  Engine,
  Scene,
  SceneLoader,
  Tools,
  Vector3
} from "babylonjs";

import { Extensions } from "babylonjs-editor";

export default class Game {
  // Public members
  public engine: Engine;
  public canvas: HTMLCanvasElement = <HTMLCanvasElement>(
    document.getElementById("renderCanvas")
  );

  public scene: Scene = null;

  /**
   * Constructor
   */
  constructor() {
    // Create engine
    this.engine = new Engine(this.canvas, true, {
      // Options
    });

    // Events
    window.addEventListener("resize", () => this.engine.resize());
  }

  /**
   * Runs the game
   */
  public run(): void {
    // Load Scene
    SceneLoader.Load(
      "./scene/",
      "scene.{{scene_format}}",
      this.engine,
      (scene: Scene) => {
        this.scene = scene;

        // No camera?
        if (!this.scene.activeCamera) {
          this.scene.createDefaultCamera(false, true, true);
        }

        // No light?
        if (!this.scene.lights.length) {
          this.scene.createDefaultLight();
        }

        // Attach camera
        this.scene.activeCamera.attachControl(this.canvas, true);

        // Load extensions
        Tools.LoadFile("./scene/project.editorproject", (data: string) => {
          // Apply extensions (such as custom code, custom materials etc.)
          Extensions.RoolUrl = "./scene/";
          Extensions.ApplyExtensions(this.scene, JSON.parse(data));

          // Run render loop
          this.engine.runRenderLoop(() => {
            this.scene.render();
          });
        });
      }
    );
  }
}
