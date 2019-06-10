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
  public engine: Engine;
  public canvas: HTMLCanvasElement = <HTMLCanvasElement>(
    document.getElementById("renderCanvas")
  );

  public scene: Scene = null;
  constructor() {
    this.engine = new Engine(this.canvas, true, {});
    window.addEventListener("resize", () => this.engine.resize());
  }

  public run(): void {
    const rainyDay = `./scenes/Rainy-Day/`;
    //const spaceScene = `./scenes/Space-Scene/`;
    let currentScene = rainyDay;

    SceneLoader.Load(
      `${currentScene}`,
      "scene.babylon",
      this.engine,
      (scene: Scene) => {
        this.scene = scene;
        console.log(this.scene);
        if (!this.scene.activeCamera) {
          this.scene.createDefaultCamera(false, true, true);
        }

        this.scene.activeCamera.attachControl(this.canvas, true);

        Tools.LoadFile(
          `${currentScene}/project.editorproject`,
          (data: string) => {
            Extensions.RoolUrl = currentScene;
            Extensions.ApplyExtensions(this.scene, JSON.parse(data));
            this.engine.runRenderLoop(() => {
              this.scene.render();
            });
          }
        );
      }
    );
  }
}
